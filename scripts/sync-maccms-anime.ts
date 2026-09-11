import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

interface Episode { ep: string; url: string }
interface MacCmsVod {
  vod_id?: string | number; vod_name?: string; vod_pic?: string; vod_blurb?: string;
  vod_content?: string; vod_score?: string | number; vod_year?: string | number;
  vod_class?: string; type_name?: string; vod_play_url?: string;
  vod_remarks?: string; vod_time?: string; vod_time_add?: string | number;
  vod_isend?: string | number; vod_area?: string;
}
interface MacCmsResponse { pagecount?: number | string; total?: number | string; list?: MacCmsVod[] }
interface AnimeRow {
  external_id: string; title: string; cover_url: string | null; description: string | null;
  rating: number; year: number; genres: string[]; episodes: Episode[];
  status: 'completed' | 'ongoing'; region_category: string | null; area: string | null;
  source_site: string; updated_at: string; release_date: string;
}
type AnimeDbRow = Omit<AnimeRow, 'episodes'>;
interface SyncOptions { source: string; startPage: number; pages: number; batchSize: number; all: boolean; delayMs: number; typeIds: Array<string | undefined> }

const DEFAULT_SOURCE = 'https://ffzy5.tv/api.php/provide/vod/?ac=detail';
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

function sourceUpdatedAt(vod: MacCmsVod, fallback: string): string {
  const unixSeconds = Number(vod.vod_time_add);
  if (Number.isFinite(unixSeconds) && unixSeconds > 0) return new Date(unixSeconds * 1000).toISOString();
  if (vod.vod_time) {
    const parsed = new Date(vod.vod_time.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return fallback;
}

function normalizeVod(vod: MacCmsVod, sourceSite: string, fallbackUpdatedAt: string): AnimeRow | null {
  const externalId = String(vod.vod_id ?? '').trim();
  const title = vod.vod_name?.trim() ?? '';
  const episodes = parseVodPlayUrl(vod.vod_play_url ?? '');
  if (!externalId || !title || episodes.length === 0) return null;
  const rawRating = Number(vod.vod_score);
  const rawYear = Number.parseInt(String(vod.vod_year ?? ''), 10);
  const genres = (vod.vod_class ?? '').split(/[,/，]/).map(item => item.trim()).filter(Boolean);
  const updatedAt = sourceUpdatedAt(vod, fallbackUpdatedAt);
  const status = Number(vod.vod_isend) === 1 || (vod.vod_remarks ?? '').includes('完结') ? 'completed' : 'ongoing';
  return {
    external_id: externalId,
    title,
    cover_url: vod.vod_pic ? upgradeProtocol(vod.vod_pic) : null,
    description: stripHtml(vod.vod_blurb || vod.vod_content),
    rating: Number.isFinite(rawRating) && rawRating >= 0 && rawRating <= 10 ? Math.round(rawRating * 10) / 10 : 8.5,
    year: Number.isSafeInteger(rawYear) && rawYear >= 1900 && rawYear <= 2100 ? rawYear : 2026,
    genres: genres.length > 0 ? genres : ['Action', 'Fantasy'],
    episodes,
    status,
    region_category: vod.type_name?.trim() || null,
    area: vod.vod_area?.trim() || null,
    source_site: sourceSite,
    updated_at: updatedAt,
    release_date: updatedAt,
  };
}

function pageUrl(source: string, page: number, typeId?: string): string {
  const url = new URL(source);
  url.searchParams.set('pg', String(page));
  if (typeId) url.searchParams.set('t', typeId);
  return url.toString();
}

async function fetchPage(source: string, page: number, typeId?: string): Promise<MacCmsResponse> {
  const targetUrl = pageUrl(source, page, typeId);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`MacCMS request failed for page ${page}: HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as unknown;
    if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as MacCmsResponse).list)) {
      throw new Error(`MacCMS returned an invalid response for page ${page}.`);
    }
    return payload as MacCmsResponse;
  } catch (err: unknown) {
    console.error(`[Fetch Failed] 无法请求 URL: ${targetUrl}`);
    if (err && typeof err === 'object' && 'cause' in err) {
      console.error('底层网络报错 (err.cause):', (err as { cause: unknown }).cause);
    }
    throw err;
  }
}

function apiCount(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function safeUpsert(supabase: SupabaseClient, dbBatch: AnimeDbRow[], retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const { error } = await supabase.from('animes').upsert(dbBatch, { onConflict: 'external_id' });
      if (!error) return true;
      console.warn(`[Supabase Warning] 写入失败 (第 ${attempt}/${retries} 次): ${error.message}`);
    } catch (error: unknown) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      console.warn(`[Supabase Warning] 发生网络/520网关异常，第 ${attempt}/${retries} 次重试...${detail}`);
    }
    if (attempt < retries) await delay(1000 * Math.pow(2, attempt - 1));
  }
  console.error('[Supabase Error] 批次写入彻底失败，跳过该批次。');
  return false;
}

async function main(): Promise<void> {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const options = parseOptions(process.argv.slice(2));
  const syncStartedAt = new Date().toISOString();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is required in .env.local or the process environment.');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local or the process environment.');

  // ================= 1. 读取 R2 环境变量并初始化 S3 客户端 =================
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are required in .env.local.');
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

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
      processedPages += 1;
      console.log(`[Page ${processedPages}/${totalPages}] Processing category ${discovery.typeId ?? 'all'}, source page ${page}...`);
      const payload = page === firstPage ? discovery.firstPayload : await fetchPage(options.source, page, discovery.typeId);
      const rows = (payload.list ?? []).map(vod => normalizeVod(vod, sourceSite, syncStartedAt));
      const validRows = rows.filter((row): row is AnimeRow => row !== null);
      skipped += rows.length - validRows.length;

      for (let index = 0; index < validRows.length; index += options.batchSize) {
        const batch = validRows.slice(index, index + options.batchSize);

        // ================= 2. 并行上传完整详情 JSON 到 Cloudflare R2 =================
        await Promise.all(
          batch.map(async (row) => {
            const detailPayload = {
              external_id: row.external_id,
              title: row.title,
              description: row.description,
              episodes: row.episodes, // 最占体积的播放链接列表存入 R2
            };

            await r2.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: `anime-details/${row.external_id}.json`,
              Body: JSON.stringify(detailPayload),
              ContentType: 'application/json',
            }));
          })
        );

        // ================= 3. 剔除 episodes 巨型字段，瘦身数据库行 =================
        const dbBatch = batch.map((item) => {
          const { episodes, ...rest } = item;
          void episodes;
          return rest;
        });

        // 写入 Supabase 数据库
        const written = await safeUpsert(supabase, dbBatch);
        if (written) imported += dbBatch.length;
        else skipped += dbBatch.length;
      }
      console.log(`[Page ${processedPages}/${totalPages}] Processed ${validRows.length} items (R2 JSON + Supabase Index). Cumulative total: ${imported} / ${remoteTotal}. Skipped: ${rows.length - validRows.length}.`);
      await delay(300);
    }
  }
  console.log(`Anime sync complete: ${imported} upserted, ${skipped} skipped.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
