import os

from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import HistoryResponse, QuoteResponse, StatisticsResponse, StockDashboardResponse
from .stock_service import ProviderRateLimitError, StockDataError, StockService, TickerNotFoundError


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(
    title="Portfolio Stock API",
    version="1.0.0",
    description="Quote, OHLCV history, and key statistics backed by Yahoo Finance through yfinance.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
service = StockService(cache_ttl_seconds=int(os.getenv("STOCK_CACHE_TTL_SECONDS", "30")))


def _raise_http_error(error: Exception) -> None:
    if isinstance(error, ValueError):
        raise HTTPException(status_code=422, detail=str(error)) from error
    if isinstance(error, TickerNotFoundError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, ProviderRateLimitError):
        raise HTTPException(status_code=429, detail=str(error), headers={"Retry-After": "30"}) from error
    raise HTTPException(status_code=502, detail="Market data provider is temporarily unavailable.") from error


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/stocks/{ticker}", response_model=StockDashboardResponse)
def stock_dashboard(
    ticker: str = Path(min_length=1, max_length=15),
    period: str = Query(default="1mo"),
    interval: str = Query(default="1d"),
    prepost: bool = Query(default=False),
) -> StockDashboardResponse:
    try:
        return service.dashboard(ticker, period, interval, prepost)
    except (ValueError, StockDataError) as error:
        _raise_http_error(error)
        raise AssertionError("unreachable")


@app.get("/api/stocks/{ticker}/quote", response_model=QuoteResponse)
def stock_quote(ticker: str = Path(min_length=1, max_length=15)) -> QuoteResponse:
    try:
        return service.quote(ticker)
    except (ValueError, StockDataError) as error:
        _raise_http_error(error)
        raise AssertionError("unreachable")


@app.get("/api/stocks/{ticker}/history", response_model=HistoryResponse)
def stock_history(
    ticker: str = Path(min_length=1, max_length=15),
    period: str = Query(default="1mo"),
    interval: str = Query(default="1d"),
    prepost: bool = Query(default=False),
) -> HistoryResponse:
    try:
        return service.history(ticker, period, interval, prepost)
    except (ValueError, StockDataError) as error:
        _raise_http_error(error)
        raise AssertionError("unreachable")


@app.get("/api/stocks/{ticker}/statistics", response_model=StatisticsResponse)
def stock_statistics(ticker: str = Path(min_length=1, max_length=15)) -> StatisticsResponse:
    try:
        return service.statistics(ticker)
    except (ValueError, StockDataError) as error:
        _raise_http_error(error)
        raise AssertionError("unreachable")
