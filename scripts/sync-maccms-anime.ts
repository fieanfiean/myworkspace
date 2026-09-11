import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import process from 'node:process';

interface Episode { ep: string; url: string }
interface MacCmsVod {
  vod_id?: string | number; vod_name?: string; vod_pic?: string; vod_blurb?: string;
  vod_content?: string; vod_score?: string | number; vod_year?: string | number;
  vod_class?: string; type_name?: string; vod_play_url?: string;
}
interface MacCmsResponse { pagecount?: number | string; total?: number | string; list?: MacCmsVod[] }
interface AnimeRow {
  external_id: string; title: string; cover_url: string | null; description: string | null;
  rating: number; year: number; genres: string[]; episodes: Episode[];
  source_site: string; updated_at: string;
}
interface SyncOptions { source: string; startPage: number; pages: number; batchSize: number; all: boolean; delayMs: number; typeIds: Array<string | undefined> }

const DEFAULT_SOURCE = 'https://lhdhl.com/api.php/provide/vod/?ac=detail';
const ANIME_TYPE_IDS = ['4', '29', '30', '31', '32', '33'];

function optionValue(args: string[], name: string): string | undefined {
  const equalsArg = args.find(arg => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function optionValues(args: string[], name: string): string[] {
  const values: string[] = [];
  args.forEach((arg, index) => {
    if (arg.startsWith(`${name}=`)) values.push(arg.slice(name.length + 1));
    else if (arg === name && args[index + 1] && !args[index + 1].startsWith('--')) values.push(args[index + 1]);
  });
  return values.flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean);
}

function positiveInteger(value: string | undefined, fallback: number, flag: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}

function parseOptions(args: string[]): SyncOptions {
  if (args.includes('--help')) {
    console.log('Usage: npm run sync:anime -- [--all] [--source URL] [--type 4,29,30] [--start-page N] [--pages N] [--batch-size N] [--delay MS]');
    process.exit(0);
  }
  const source = optionValue(args, '--source') || DEFAULT_SOURCE;
  const explicitTypeIds = optionValues(args, '--type');
  if (args.includes('--type') && explicitTypeIds.length === 0) throw new Error('--type requires one or more category IDs.');
  const sourceTypeId = new URL(source).searchParams.get('t') ?? undefined;
  const all = args.includes('--all');
  const typeIds = explicitTypeIds.length > 0 ? explicitTypeIds : all && sourceTypeId === '4' ? ANIME_TYPE_IDS : [sourceTypeId];
  return {
    source,
    startPage: positiveInteger(optionValue(args, '--start-page'), 1, '--start-page'),
    pages: positiveInteger(optionValue(args, '--pages'), 1, '--pages'),
    batchSize: positiveInteger(optionValue(args, '--batch-size'), 100, '--batch-size'),
    all,
    delayMs: positiveInteger(optionValue(args, '--delay'), 300, '--delay'),
    typeIds: [...new Set(typeIds)],
  };
}

function upgradeProtocol(value: string): string {
  return value.trim().replace(/^http:\/\//i, 'https://');
}

export function parseVodPlayUrl(rawUrlString: string): Episode[] {
  if (!rawUrlString) return [];
  const sourceLines = rawUrlString.split('$$$');
  const m3u8Line = sourceLines.find(line => line.toLocaleLowerCase().includes('.m3u8')) || sourceLines[0];
  return m3u8Line.split('#').map(item => {
    const separator = item.indexOf('$');
    const ep = separator >= 0 ? item.slice(0, separator).trim() : '';
    const rawUrl = separator >= 0 ? item.slice(separator + 1).trim() : '';
    if (!rawUrl.toLocaleLowerCase().includes('.m3u8')) return null;
    const url = upgradeProtocol(rawUrl);
    try { if (new URL(url).protocol !== 'https:') return null; }
    catch { return null; }
    return { ep: ep || 'Full Movie', url };
  }).filter((item): item is Episode => item !== null);
}

function stripHtml(value: string | undefined): string | null {
  if (!value) return null;
  const text = value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
  return text || null;
}

function normalizeVod(vod: MacCmsVod, sourceSite: string, updatedAt: string): AnimeRow | null {
  const externalId = String(vod.vod_id ?? '').trim();
  const title = vod.vod_name?.trim() ?? '';
  const episodes = parseVodPlayUrl(vod.vod_play_url ?? '');
  if (!externalId || !title || episodes.length === 0) return null;
  const rawRating = Number(vod.vod_score);
  const rawYear = Number.parseInt(String(vod.vod_year ?? ''), 10);
  const genres = (vod.vod_class ?? '').split(/[,/，]/).map(item => item.trim()).filter(Boolean);
  const typeName = vod.type_name?.trim();
  if (typeName && !genres.includes(typeName)) genres.push(typeName);
  return {
    external_id: externalId,
    title,
    cover_url: vod.vod_pic ? upgradeProtocol(vod.vod_pic) : null,
    description: stripHtml(vod.vod_blurb || vod.vod_content),
    rating: Number.isFinite(rawRating) && rawRating >= 0 && rawRating <= 10 ? Math.round(rawRating * 10) / 10 : 8.5,
    year: Number.isSafeInteger(rawYear) && rawYear >= 1900 && rawYear <= 2100 ? rawYear : 2026,
    genres: genres.length > 0 ? genres : ['Action', 'Fantasy'],
    episodes,
    source_site: sourceSite,
    updated_at: updatedAt,
  };
}

function pageUrl(source: string, page: number, typeId?: string): string {
  const url = new URL(source);
  url.searchParams.set('pg', String(page));
  if (typeId) url.searchParams.set('t', typeId);
  return url.toString();
}

async function fetchPage(source: string, page: number, typeId?: string): Promise<MacCmsResponse> {
  const response = await fetch(pageUrl(source, page, typeId), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`MacCMS request failed for page ${page}: HTTP ${response.status} ${response.statusText}`);
  const payload = await response.json() as unknown;
  if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as MacCmsResponse).list)) {
    throw new Error(`MacCMS returned an invalid response for page ${page}.`);
  }
  return payload as MacCmsResponse;
}

function apiCount(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const options = parseOptions(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is required in .env.local or the process environment.');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local or the process environment.');

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const sourceSite = new URL(options.source).origin;
  let imported = 0;
  let skipped = 0;
  const firstPage = options.all ? 1 : options.startPage;
  const discoveries: Array<{ typeId?: string; firstPayload: MacCmsResponse; lastPage: number; remoteTotal: number }> = [];
  for (const typeId of options.typeIds) {
    if (discoveries.length > 0) await delay(options.delayMs);
    const firstPayload = await fetchPage(options.source, firstPage, typeId);
    const hasPageCount = Number.isSafeInteger(Number(firstPayload.pagecount)) && Number(firstPayload.pagecount) > 0;
    if (options.all && !hasPageCount) throw new Error(`MacCMS response did not include a valid pagecount required by --all${typeId ? ` for type ${typeId}` : ''}.`);
    const discoveredPageCount = apiCount(firstPayload.pagecount, firstPage);
    const requestedLastPage = options.startPage + options.pages - 1;
    const lastPage = options.all ? discoveredPageCount : hasPageCount ? Math.min(discoveredPageCount, requestedLastPage) : requestedLastPage;
    discoveries.push({ typeId, firstPayload, lastPage, remoteTotal: apiCount(firstPayload.total, (firstPayload.list ?? []).length) });
  }

  const totalPages = discoveries.reduce((sum, item) => sum + item.lastPage - firstPage + 1, 0);
  const remoteTotal = discoveries.reduce((sum, item) => sum + item.remoteTotal, 0);
  console.log(`MacCMS reports ${remoteTotal} items across ${totalPages} pages for categories ${options.typeIds.filter(Boolean).join(', ') || 'all'}.`);
  let processedPages = 0;
  for (const discovery of discoveries) {
    for (let page = firstPage; page <= discovery.lastPage; page += 1) {
      if (processedPages > 0) await delay(options.delayMs);
      processedPages += 1;
      console.log(`[Page ${processedPages}/${totalPages}] Processing category ${discovery.typeId ?? 'all'}, source page ${page}...`);
      const payload = page === firstPage ? discovery.firstPayload : await fetchPage(options.source, page, discovery.typeId);
      const rows = (payload.list ?? []).map(vod => normalizeVod(vod, sourceSite, new Date().toISOString()));
      const validRows = rows.filter((row): row is AnimeRow => row !== null);
      skipped += rows.length - validRows.length;
      for (let index = 0; index < validRows.length; index += options.batchSize) {
        const batch = validRows.slice(index, index + options.batchSize);
        const { error } = await supabase.from('animes').upsert(batch, { onConflict: 'external_id' });
        if (error) throw new Error(`Supabase upsert failed for category ${discovery.typeId ?? 'all'}, page ${page}: ${error.message}`);
        imported += batch.length;
      }
      console.log(`[Page ${processedPages}/${totalPages}] Upserted ${validRows.length} items. Cumulative total: ${imported} / ${remoteTotal}. Skipped: ${rows.length - validRows.length}.`);
    }
  }
  console.log(`Anime sync complete: ${imported} upserted, ${skipped} skipped.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
