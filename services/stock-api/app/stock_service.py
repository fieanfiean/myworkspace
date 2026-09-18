from __future__ import annotations

import math
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

import pandas as pd
import yfinance as yf

from .models import Candle, HistoryResponse, QuoteResponse, StatisticsResponse, StockDashboardResponse


VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}
VALID_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"}
TICKER_PATTERN = re.compile(r"^[A-Z0-9^][A-Z0-9.^=_-]{0,14}$")
MAX_CANDLES = 5_000


class StockDataError(RuntimeError):
    """Raised when market data cannot be retrieved or normalized."""


class TickerNotFoundError(StockDataError):
    """Raised when Yahoo Finance returns no price history for a symbol."""


class ProviderRateLimitError(StockDataError):
    """Raised when Yahoo Finance temporarily throttles requests."""


@dataclass
class CacheEntry:
    expires_at: float
    value: Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 30) -> None:
        self.ttl_seconds = ttl_seconds
        self._entries: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()

    def get_or_set(self, key: str, factory: Callable[[], Any]) -> Any:
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry and entry.expires_at > now:
                return entry.value
        value = factory()
        with self._lock:
            self._entries[key] = CacheEntry(now + self.ttl_seconds, value)
        return value


def normalize_ticker(value: str) -> str:
    ticker = value.strip().upper()
    if not TICKER_PATTERN.fullmatch(ticker):
        raise ValueError("Ticker must be 1-15 characters using letters, numbers, '.', '-', '=', '_' or '^'.")
    return ticker


def _number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _first_number(*values: Any) -> float | None:
    for value in values:
        number = _number(value)
        if number is not None:
            return number
    return None


def _mapping_value(mapping: Any, key: str) -> Any:
    try:
        return mapping[key]
    except Exception:  # Some yfinance mappings fetch lazily and can raise upstream errors.
        return None


def _safe_info(instrument: yf.Ticker) -> dict[str, Any]:
    try:
        value = instrument.info
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def _stock_data_error(message: str, error: Exception) -> StockDataError:
    if error.__class__.__name__ == "YFRateLimitError":
        return ProviderRateLimitError("Yahoo Finance rate limit reached. Try again shortly.")
    return StockDataError(message)


class StockService:
    def __init__(self, cache_ttl_seconds: int = 30) -> None:
        self.cache = TTLCache(cache_ttl_seconds)

    def _ticker(self, symbol: str) -> yf.Ticker:
        return yf.Ticker(normalize_ticker(symbol))

    def history(self, symbol: str, period: str, interval: str, prepost: bool = False) -> HistoryResponse:
        ticker = normalize_ticker(symbol)
        if period not in VALID_PERIODS:
            raise ValueError(f"Unsupported period. Choose one of: {', '.join(sorted(VALID_PERIODS))}.")
        if interval not in VALID_INTERVALS:
            raise ValueError(f"Unsupported interval. Choose one of: {', '.join(sorted(VALID_INTERVALS))}.")

        def fetch() -> HistoryResponse:
            try:
                frame = self._ticker(ticker).history(
                    period=period,
                    interval=interval,
                    prepost=prepost,
                    auto_adjust=False,
                    actions=False,
                    timeout=12,
                    raise_errors=True,
                )
            except Exception as exc:  # yfinance exposes several upstream exception types
                raise _stock_data_error(f"Unable to fetch history for {ticker}.", exc) from exc
            if frame.empty:
                raise TickerNotFoundError(f"No market data found for ticker {ticker}.")
            frame = frame.tail(MAX_CANDLES)
            candles = [self._candle(timestamp, row) for timestamp, row in frame.iterrows()]
            return HistoryResponse(ticker=ticker, period=period, interval=interval, candles=candles)

        return self.cache.get_or_set(f"history:{ticker}:{period}:{interval}:{prepost}", fetch)

    @staticmethod
    def _candle(timestamp: Any, row: pd.Series) -> Candle:
        parsed = pd.Timestamp(timestamp)
        if parsed.tzinfo is None:
            parsed = parsed.tz_localize("UTC")
        return Candle(
            timestamp=parsed.to_pydatetime(),
            open=float(row["Open"]),
            high=float(row["High"]),
            low=float(row["Low"]),
            close=float(row["Close"]),
            volume=max(0, int(row.get("Volume", 0))),
        )

    def quote(self, symbol: str) -> QuoteResponse:
        ticker = normalize_ticker(symbol)

        def fetch() -> QuoteResponse:
            instrument = self._ticker(ticker)
            fast = instrument.fast_info
            info = _safe_info(instrument)
            price = _first_number(_mapping_value(fast, "last_price"), info.get("currentPrice"))
            if price is None:
                try:
                    recent = instrument.history(
                        period="5d", interval="1d", auto_adjust=False, actions=False, timeout=12
                    )
                except Exception as exc:
                    raise _stock_data_error(f"Unable to fetch quote for {ticker}.", exc) from exc
                if recent.empty:
                    raise TickerNotFoundError(f"No market data found for ticker {ticker}.")
                price = _number(recent["Close"].iloc[-1])
            if price is None:
                raise StockDataError(f"Yahoo Finance returned no usable price for {ticker}.")
            previous_close = _first_number(_mapping_value(fast, "previous_close"), info.get("previousClose"))
            change = price - previous_close if previous_close is not None else None
            change_percent = change / previous_close * 100 if change is not None and previous_close else None
            exchange_timestamp = _first_number(info.get("regularMarketTime"))
            as_of = datetime.fromtimestamp(exchange_timestamp, timezone.utc) if exchange_timestamp else datetime.now(timezone.utc)
            return QuoteResponse(
                ticker=ticker,
                company_name=info.get("longName") or info.get("shortName"),
                exchange=info.get("fullExchangeName") or info.get("exchange"),
                currency=info.get("currency") or _mapping_value(fast, "currency"),
                price=price,
                previous_close=previous_close,
                change=change,
                change_percent=change_percent,
                market_state=info.get("marketState"),
                as_of=as_of,
            )

        return self.cache.get_or_set(f"quote:{ticker}", fetch)

    def statistics(self, symbol: str) -> StatisticsResponse:
        ticker = normalize_ticker(symbol)

        def fetch() -> StatisticsResponse:
            instrument = self._ticker(ticker)
            fast = instrument.fast_info
            info = _safe_info(instrument)
            return StatisticsResponse(
                ticker=ticker,
                market_cap=_first_number(info.get("marketCap"), _mapping_value(fast, "market_cap")),
                trailing_pe=_number(info.get("trailingPE")),
                forward_pe=_number(info.get("forwardPE")),
                fifty_two_week_low=_first_number(info.get("fiftyTwoWeekLow"), _mapping_value(fast, "year_low")),
                fifty_two_week_high=_first_number(info.get("fiftyTwoWeekHigh"), _mapping_value(fast, "year_high")),
                average_volume=_first_number(info.get("averageVolume"), info.get("averageDailyVolume10Day")),
            )

        return self.cache.get_or_set(f"statistics:{ticker}", fetch)

    def dashboard(self, symbol: str, period: str, interval: str, prepost: bool = False) -> StockDashboardResponse:
        return StockDashboardResponse(
            quote=self.quote(symbol),
            history=self.history(symbol, period, interval, prepost),
            statistics=self.statistics(symbol),
        )
