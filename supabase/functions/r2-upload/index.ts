import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface UploadRequest {
  filename?: unknown;
  contentType?: unknown;
}

class RequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function safeObjectPath(filename: string): string {
  const parts = filename.trim().replace(/\\/g, '/').split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new RequestError('filename must be a safe relative object path.');
  }
  const sanitized = parts.map(part => part
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180));
  if (sanitized.some(part => !part || part === '.' || part === '..')) {
    throw new RequestError('filename must contain valid path segments.');
  }
  return sanitized.join('/');
}

function validateContentType(value: unknown): string {
  if (typeof value !== 'string') throw new RequestError('contentType is required.');
  const contentType = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(contentType)) {
    throw new RequestError('contentType must be a valid MIME type.');
  }
  return contentType;
}

Deno.serve(async request => {
  try {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: corsHeaders });
    }
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

    const authorization = request.headers.get('Authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new RequestError('Missing Supabase authentication token.', 401);

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(match[1]);
    if (authError || !user) throw new RequestError('Invalid or expired authentication token.', 401);

    let payload: UploadRequest;
    try {
      payload = await request.json() as UploadRequest;
    } catch {
      throw new RequestError('Request body must be valid JSON.');
    }

    if (typeof payload.filename !== 'string') throw new RequestError('filename is required.');
    const objectPath = safeObjectPath(payload.filename);
    const contentType = validateContentType(payload.contentType);

    const accountId = requiredEnv('R2_ACCOUNT_ID');
    const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
    const bucket = requiredEnv('R2_BUCKET_NAME');
    const publicBaseUrl = requiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');

    const [folder, ...pathParts] = objectPath.split('/');
    if (!folder || pathParts.length === 0) throw new RequestError('filename must include a folder and file name.');
    const key = `${folder}/${user.id}/${pathParts.join('/')}`;
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return jsonResponse({
      uploadUrl,
      publicUrl: `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
      key,
    });
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status);
    console.error('Unable to create R2 upload URL.', error);
    const message = error instanceof Error ? error.message : 'Unable to create upload URL.';
    return jsonResponse({ error: message }, 400);
  }
});
