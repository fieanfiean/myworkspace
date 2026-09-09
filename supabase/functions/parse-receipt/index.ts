declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL_NAME = 'gemini-3.7-flash';
const FALLBACK_MODEL_NAME = 'gemini-2.0-flash';

const allowedCategories = [
  'Groceries',
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Other',
] as const;

type ReceiptCategory = typeof allowedCategories[number];
type TransactionType = 'expense' | 'income';

interface ReceiptResult {
  amount: number;
  currency: 'MYR';
  date: string;
  time: string;
  description: string;
  type: TransactionType;
  suggested_category: ReceiptCategory;
}

interface JsonImagePayload {
  base64?: unknown;
  image?: unknown;
  image_base64?: unknown;
  mimeType?: unknown;
  mime_type?: unknown;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

class RequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

class GeminiApiError extends Error {
  constructor(message: string, readonly status: number, readonly details: string) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchGeminiWithRetry(url: string, requestBody: string, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      // Gemini API keys belong only in the URL query string. Do not add an
      // Authorization header here; that header expects an OAuth 2 access token.
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (response.ok || (response.status !== 503 && response.status !== 429)) return response;
    if (attempt >= maxRetries) return response;

    console.warn(`Gemini API returned ${response.status}. Retry attempt ${attempt + 1}/${maxRetries}...`);
    await response.body?.cancel();
    await new Promise<void>(resolve => setTimeout(resolve, 1_000));
  }

  throw new Error('Gemini API request failed after retries.');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function normalizeBase64(value: string, fallbackMimeType: string): { data: string; mimeType: string } {
  const trimmed = value.trim();
  const dataUrl = /^data:([^;,]+);base64,(.+)$/s.exec(trimmed);
  const data = (dataUrl?.[2] ?? trimmed).replace(/\s/g, '');
  const mimeType = dataUrl?.[1] ?? fallbackMimeType;

  if (!mimeType.startsWith('image/')) throw new RequestError('The uploaded payload must be an image.');
  if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) {
    throw new RequestError('The image base64 payload is invalid.');
  }
  try {
    atob(data);
  } catch {
    throw new RequestError('The image base64 payload is invalid.');
  }
  return { data, mimeType };
}

async function imageFromRequest(request: Request): Promise<{ data: string; mimeType: string }> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const preferred = formData.get('image') ?? formData.get('file');
    const file = preferred instanceof File
      ? preferred
      : [...formData.values()].find((value): value is File => value instanceof File);
    if (!file) throw new RequestError('FormData must contain an image file in the image or file field.');
    if (!file.type.startsWith('image/')) throw new RequestError('The uploaded file must be an image.');
    if (file.size === 0) throw new RequestError('The uploaded image is empty.');
    return { data: bytesToBase64(new Uint8Array(await file.arrayBuffer())), mimeType: file.type };
  }

  if (contentType.includes('application/json')) {
    let payload: JsonImagePayload;
    try {
      payload = await request.json() as JsonImagePayload;
    } catch {
      throw new RequestError('The JSON request body is invalid.');
    }
    const base64 = [payload.base64, payload.image_base64, payload.image]
      .find((value): value is string => typeof value === 'string');
    if (!base64) throw new RequestError('JSON must contain a base64, image_base64, or image string.');
    const requestedMimeType = typeof payload.mimeType === 'string'
      ? payload.mimeType
      : typeof payload.mime_type === 'string' ? payload.mime_type : 'image/jpeg';
    return normalizeBase64(base64, requestedMimeType);
  }

  if (contentType.startsWith('image/')) {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0) throw new RequestError('The uploaded image is empty.');
    return { data: bytesToBase64(bytes), mimeType: contentType.split(';')[0] };
  }

  const rawBase64 = await request.text();
  return normalizeBase64(rawBase64, 'image/jpeg');
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function parseReceipt(value: unknown): ReceiptResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RequestError('Gemini returned an invalid receipt object.', 502);
  }
  const record = value as Record<string, unknown>;
  const amount = typeof record.amount === 'number' ? record.amount : Number(record.amount);
  const date = typeof record.date === 'string' ? record.date : '';
  const time = typeof record.time === 'string' ? record.time : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const type = record.type;
  const category = record.suggested_category;

  if (!Number.isFinite(amount) || amount < 0) throw new RequestError('Gemini returned an invalid amount.', 502);
  if (record.currency !== 'MYR') throw new RequestError('Gemini returned an unsupported currency.', 502);
  if (!isDate(date)) throw new RequestError('Gemini returned an invalid date.', 502);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RequestError('Gemini returned an invalid time.', 502);
  if (!description) throw new RequestError('Gemini did not identify a merchant or payee.', 502);
  if (type !== 'expense' && type !== 'income') throw new RequestError('Gemini returned an invalid transaction type.', 502);
  if (typeof category !== 'string' || !allowedCategories.includes(category as ReceiptCategory)) {
    throw new RequestError('Gemini returned an invalid suggested category.', 502);
  }

  return {
    amount,
    currency: 'MYR',
    date,
    time,
    description,
    type,
    suggested_category: category as ReceiptCategory,
  };
}

async function callGemini(apiKey: string, image: { data: string; mimeType: string }): Promise<ReceiptResult> {
  const requestBody = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Read this Malaysian receipt or transaction image and return only the requested JSON. Treat RM as MYR, extract the final paid total, and use the merchant or payee as description. Use 00:00 only when no time is visible. Classify conservatively and never invent text.' },
          { inline_data: { mime_type: image.mimeType, data: image.data } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        response_mime_type: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          required: ['amount', 'currency', 'date', 'time', 'description', 'type', 'suggested_category'],
          properties: {
            amount: { type: 'NUMBER' },
            currency: { type: 'STRING', enum: ['MYR'] },
            date: { type: 'STRING', description: 'Transaction date in YYYY-MM-DD format.' },
            time: { type: 'STRING', description: 'Transaction time in 24-hour HH:mm format.' },
            description: { type: 'STRING', description: 'Merchant or payee name.' },
            type: { type: 'STRING', enum: ['expense', 'income'] },
            suggested_category: { type: 'STRING', enum: [...allowedCategories] },
          },
        },
      },
    });

  for (const modelName of [MODEL_NAME, FALLBACK_MODEL_NAME]) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetchGeminiWithRetry(geminiUrl, requestBody);
    const responseText = await geminiRes.text();

    if (!geminiRes.ok) {
      console.error(`Gemini API Error [${geminiRes.status}]:`, responseText);
      if (geminiRes.status === 404 && modelName === MODEL_NAME) continue;

      let userMessage = `Gemini API returned ${geminiRes.status}`;
      if (geminiRes.status === 429) userMessage = 'AI recognition rate limit reached. Please wait 5–10 seconds and try again.';
      else if (geminiRes.status === 503) userMessage = 'AI recognition service is temporarily unavailable. Please wait a moment and try again.';
      else if (geminiRes.status === 400) userMessage = 'Invalid image or payload format sent to AI service.';
      throw new GeminiApiError(userMessage, geminiRes.status, responseText);
    }

    let payload: GeminiResponse;
    try {
      payload = JSON.parse(responseText) as GeminiResponse;
    } catch {
      throw new RequestError('Gemini returned an invalid API response.', 502);
    }
    const text = payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text ?? '')
      .join('')
      .trim();
    if (!text) throw new RequestError('Gemini returned no receipt data.', 502);

    try {
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) as unknown;
      return parseReceipt(parsed);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError('Gemini returned malformed JSON.', 502);
    }
  }

  throw new GeminiApiError('No supported Gemini model is currently available.', 404, 'Primary and fallback models returned 404.');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured.');
      return jsonResponse({ error: 'GEMINI_API_KEY secret is not configured.' }, 500);
    }
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed. Use POST.' }, 400);
    const image = await imageFromRequest(request);
    return jsonResponse(await callGemini(apiKey, image));
  } catch (err) {
    console.error('parse-receipt execution error:', err);
    const message = err instanceof Error ? err.message : 'Failed to process receipt';
    if (err instanceof GeminiApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 500;
      return jsonResponse({ error: message, details: err.details }, status);
    }
    const status = err instanceof RequestError && err.status < 500 ? 400 : 500;
    return jsonResponse({ error: message }, status);
  }
});
