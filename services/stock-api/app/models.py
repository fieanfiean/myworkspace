from datetime import datetime

from pydantic import BaseModel, Field


class QuoteResponse(BaseModel):
    ticker: str
    company_name: str | None = None
    exchange: str | None = None
    currency: str | None = None
    price: float
    previous_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    market_state: str | None = None
    as_of: datetime
    source: str = "Yahoo Finance via yfinance"
    delayed: bool = True


class Candle(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int = Field(ge=0)


class HistoryResponse(BaseModel):
    ticker: str
    period: str
    interval: str
    candles: list[Candle]


class StatisticsResponse(BaseModel):
    ticker: str
    market_cap: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    fifty_two_week_low: float | None = None
    fifty_two_week_high: float | None = None
    average_volume: float | None = None


class StockDashboardResponse(BaseModel):
    quote: QuoteResponse
    history: HistoryResponse
    statistics: StatisticsResponse
