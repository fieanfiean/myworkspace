export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma: number;
}

export interface WatchlistStock {
  ticker: string;
  company: string;
  price: number;
  change: number;
  sparkline: number[];
}

export const stockSummary = {
  ticker: 'AAPL',
  company: 'Apple Inc.',
  exchange: 'NASDAQ',
  price: 193.45,
  change: 2.35,
  changePercent: 1.23,
  marketCap: '$3.01T',
  peRatio: '32.4',
  volume: '54.2M',
  weekLow: 124.17,
  weekHigh: 199.62,
};

export const priceHistory: PricePoint[] = [
  { date: 'Jun 03', open: 187.2, high: 190.1, low: 185.7, close: 189.4, volume: 41, ma: 187.2 },
  { date: 'Jun 04', open: 189.6, high: 191.5, low: 187.8, close: 188.3, volume: 36, ma: 187.9 },
  { date: 'Jun 05', open: 188.1, high: 190.7, low: 186.9, close: 190.1, volume: 44, ma: 188.5 },
  { date: 'Jun 06', open: 190.3, high: 193.4, low: 189.5, close: 192.8, volume: 52, ma: 189.4 },
  { date: 'Jun 07', open: 192.5, high: 194.2, low: 190.8, close: 191.4, volume: 39, ma: 190.2 },
  { date: 'Jun 10', open: 191.6, high: 194.8, low: 190.9, close: 194.1, volume: 56, ma: 191.1 },
  { date: 'Jun 11', open: 194.2, high: 196.1, low: 192.7, close: 193.2, volume: 48, ma: 191.9 },
  { date: 'Jun 12', open: 193.1, high: 195.9, low: 191.8, close: 195.4, volume: 61, ma: 192.8 },
  { date: 'Jun 13', open: 195.5, high: 197.2, low: 193.6, close: 194.0, volume: 47, ma: 193.4 },
  { date: 'Jun 14', open: 194.1, high: 196.5, low: 192.9, close: 196.2, volume: 53, ma: 194.0 },
  { date: 'Jun 17', open: 196.0, high: 198.4, low: 194.8, close: 197.7, volume: 64, ma: 194.9 },
  { date: 'Jun 18', open: 197.5, high: 199.1, low: 195.3, close: 196.0, volume: 58, ma: 195.5 },
  { date: 'Jun 20', open: 195.8, high: 197.4, low: 192.6, close: 193.5, volume: 72, ma: 195.7 },
  { date: 'Jun 21', open: 193.2, high: 195.3, low: 191.7, close: 194.7, volume: 49, ma: 195.5 },
  { date: 'Jun 24', open: 194.6, high: 196.2, low: 192.4, close: 193.45, volume: 54.2, ma: 195.1 },
];

export const quarterlyData = [
  { quarter: "Q1 '23", revenue: 94.8, income: 24.2 },
  { quarter: "Q2 '23", revenue: 81.8, income: 19.9 },
  { quarter: "Q3 '23", revenue: 89.5, income: 23.0 },
  { quarter: "Q4 '23", revenue: 119.6, income: 33.9 },
  { quarter: "Q1 '24", revenue: 90.8, income: 23.6 },
  { quarter: "Q2 '24", revenue: 85.8, income: 21.4 },
];

export const watchlist: WatchlistStock[] = [
  { ticker: 'NVDA', company: 'NVIDIA Corp.', price: 121.00, change: 2.74, sparkline: [72, 76, 74, 83, 87, 91, 96] },
  { ticker: 'MSFT', company: 'Microsoft Corp.', price: 449.78, change: 0.92, sparkline: [81, 80, 84, 83, 88, 90, 91] },
  { ticker: 'GOOGL', company: 'Alphabet Inc.', price: 179.63, change: -0.48, sparkline: [88, 86, 89, 85, 84, 82, 83] },
  { ticker: 'AMZN', company: 'Amazon.com Inc.', price: 185.00, change: 1.22, sparkline: [74, 77, 75, 80, 82, 81, 86] },
  { ticker: 'TSLA', company: 'Tesla Inc.', price: 183.01, change: -1.76, sparkline: [92, 88, 90, 84, 82, 79, 76] },
  { ticker: 'META', company: 'Meta Platforms', price: 494.78, change: 0.67, sparkline: [80, 81, 85, 84, 87, 88, 91] },
  { ticker: 'NFLX', company: 'Netflix Inc.', price: 686.12, change: 1.08, sparkline: [78, 82, 80, 85, 89, 87, 92] },
  { ticker: 'AMD', company: 'Advanced Micro Devices', price: 160.25, change: -0.83, sparkline: [91, 89, 85, 87, 82, 80, 78] },
];

export const aiTakeaways = [
  'takeawayServices',
  'takeawayMomentum',
  'takeawayValuation',
];
