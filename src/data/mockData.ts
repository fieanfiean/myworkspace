import { priceHistory, stockSummary, watchlist, type PricePoint } from './stockMockData';

export interface StockSnapshot {
  ticker: string;
  company: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: string;
  volume: string;
  weekLow: number;
  weekHigh: number;
}

export interface MockStock {
  summary: StockSnapshot;
  history: PricePoint[];
}

const transformHistory = (price: number, volatility: number, direction: number): PricePoint[] => {
  const ratio = price / stockSummary.price;
  return priceHistory.map((point, index) => {
    const wave = Math.sin(index * 1.17) * volatility + direction * index * 0.08;
    const transform = (value: number) => Number((value * ratio + wave).toFixed(2));
    const open = transform(point.open);
    const close = transform(point.close);
    return {
      ...point,
      open,
      close,
      high: Number((Math.max(open, close) + Math.abs(point.high - point.close) * ratio).toFixed(2)),
      low: Number((Math.min(open, close) - Math.abs(point.open - point.low) * ratio).toFixed(2)),
      ma: transform(point.ma),
      volume: Number((point.volume * (0.75 + ratio * 0.25)).toFixed(1)),
    };
  });
};

const snapshots: StockSnapshot[] = [
  stockSummary,
  { ticker: 'NVDA', company: 'NVIDIA Corp.', exchange: 'NASDAQ', price: 121.00, change: 3.22, changePercent: 2.74, marketCap: '$2.98T', peRatio: '70.6', volume: '312.4M', weekLow: 45.01, weekHigh: 140.76 },
  { ticker: 'MSFT', company: 'Microsoft Corp.', exchange: 'NASDAQ', price: 449.78, change: 4.10, changePercent: 0.92, marketCap: '$3.34T', peRatio: '38.9', volume: '19.8M', weekLow: 309.45, weekHigh: 468.35 },
  { ticker: 'GOOGL', company: 'Alphabet Inc.', exchange: 'NASDAQ', price: 179.63, change: -0.87, changePercent: -0.48, marketCap: '$2.22T', peRatio: '27.5', volume: '24.1M', weekLow: 115.35, weekHigh: 191.75 },
  { ticker: 'AMZN', company: 'Amazon.com Inc.', exchange: 'NASDAQ', price: 185.00, change: 2.23, changePercent: 1.22, marketCap: '$1.93T', peRatio: '51.2', volume: '41.7M', weekLow: 118.35, weekHigh: 201.20 },
  { ticker: 'TSLA', company: 'Tesla Inc.', exchange: 'NASDAQ', price: 183.01, change: -3.28, changePercent: -1.76, marketCap: '$583B', peRatio: '46.8', volume: '88.6M', weekLow: 138.80, weekHigh: 299.29 },
  { ticker: 'META', company: 'Meta Platforms', exchange: 'NASDAQ', price: 494.78, change: 3.29, changePercent: 0.67, marketCap: '$1.25T', peRatio: '28.4', volume: '12.9M', weekLow: 274.38, weekHigh: 542.81 },
  { ticker: 'NFLX', company: 'Netflix Inc.', exchange: 'NASDAQ', price: 686.12, change: 7.33, changePercent: 1.08, marketCap: '$295B', peRatio: '47.3', volume: '3.4M', weekLow: 344.73, weekHigh: 697.49 },
  { ticker: 'AMD', company: 'Advanced Micro Devices', exchange: 'NASDAQ', price: 160.25, change: -1.34, changePercent: -0.83, marketCap: '$259B', peRatio: '231.2', volume: '49.5M', weekLow: 93.12, weekHigh: 227.30 },
];

export const mockStocks = Object.fromEntries(snapshots.map((summary, index) => [
  summary.ticker,
  {
    summary,
    history: summary.ticker === 'AAPL'
      ? priceHistory
      : transformHistory(summary.price, 0.28 + index * 0.08, summary.changePercent >= 0 ? 1 : -1),
  },
])) as Record<string, MockStock>;

export const quickTickers = ['AAPL', 'NVDA', 'MSFT'];
export const searchableTickers = [stockSummary.ticker, ...watchlist.map(stock => stock.ticker)];
