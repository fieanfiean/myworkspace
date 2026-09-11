import type { CurrencyCode } from '@/types/budget';

interface OpenExchangeRateResponse {
  result: string;
  rates?: Record<string, number>;
}

let cachedMyrRates: Record<string, number> | null = null;

export async function getMyrPerCurrency(currency: CurrencyCode): Promise<number> {
  if (currency === 'MYR') return 1;
  if (!cachedMyrRates) {
    const response = await fetch('https://open.er-api.com/v6/latest/MYR');
    if (!response.ok) throw new Error(`Exchange-rate request failed (${response.status}).`);
    const payload = await response.json() as OpenExchangeRateResponse;
    if (payload.result !== 'success' || !payload.rates) throw new Error('Exchange-rate response was invalid.');
    cachedMyrRates = payload.rates;
  }
  const foreignPerMyr = cachedMyrRates[currency];
  if (!Number.isFinite(foreignPerMyr) || foreignPerMyr <= 0) throw new Error(`No exchange rate is available for ${currency}.`);
  return Math.round((1 / foreignPerMyr) * 1_000_000) / 1_000_000;
}
