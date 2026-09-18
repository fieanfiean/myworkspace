# Portfolio Stock API

FastAPI service for Yahoo Finance market data through `yfinance`.

## Run locally

```powershell
cd services/stock-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the generated OpenAPI interface.

## Endpoints

- `GET /health`
- `GET /api/stocks/AAPL?period=1mo&interval=1d`
- `GET /api/stocks/AAPL/quote`
- `GET /api/stocks/AAPL/history?period=1y&interval=1d`
- `GET /api/stocks/AAPL/statistics`

The combined endpoint returns quote, candles, and key statistics in one response. Configure browser origins through the comma-separated `CORS_ORIGINS` environment variable.

## Data caveat

Yahoo Finance data accessed through `yfinance` is intended for research and personal use and may be delayed. The API returns `delayed: true` and an `as_of` timestamp; it should not be treated as exchange-grade streaming data or used as the sole source for trading decisions.
