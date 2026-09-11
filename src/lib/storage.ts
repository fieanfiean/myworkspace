import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

export const MAX_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;

interface R2UploadSignature {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return String(error);
}

function isUploadSignature(value: unknown): value is R2UploadSignature {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.uploadUrl === 'string'
    && typeof record.publicUrl === 'string'
    && typeof record.key === 'string';
}

function safeFolder(folder: string): string {
  const normalized = folder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('R2 upload folder is invalid.');
  }
  return normalized;
}

function publicUrlFor(key: string): string {
  const baseUrl = import.meta.env.VITE_R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('R2 public URL is not configured.');
  return `${baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function compressImage(file: File, maxSizeMB: number, maxWidthOrHeight: number): Promise<File> {
  try {
    return await imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true });
  } catch (error) {
    console.warn('Image compression failed; uploading the original file.', error);
    return file;
  }
}

export async function uploadToR2(file: File, folder: string): Promise<string> {
  if (file.size === 0) throw new Error('Cannot upload an empty file.');
  const contentType = file.type.trim() || 'application/octet-stream';
  const filename = `${safeFolder(folder)}/${Date.now()}-${file.name}`;

  let signature: R2UploadSignature;
  try {
    const { data, error } = await supabase.functions.invoke('r2-upload', {
      body: { filename, contentType },
    });
    if (error) throw error;
    if (!isUploadSignature(data)) throw new Error('R2 signing service returned an invalid response.');
    signature = data;
  } catch (error) {
    throw new Error(`Unable to authorize the R2 upload: ${errorMessage(error)}`, { cause: error });
  }

  try {
    const response = await fetch(signature.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!response.ok) {
      const reason = response.status === 401 || response.status === 403
        ? 'The upload signature expired or was rejected.'
        : `R2 returned HTTP ${response.status}.`;
      throw new Error(reason);
    }
  } catch (error) {
    throw new Error(`Unable to upload the file to R2: ${errorMessage(error)}`, { cause: error });
  }

  return publicUrlFor(signature.key);
}

export async function uploadCertificateFile(file: File): Promise<string> {
  const uploadFile = file.type.startsWith('image/')
    ? await compressImage(file, 0.8, 1920)
    : file;
  return uploadToR2(uploadFile, 'certificates');
}

export async function uploadProfileAvatar(file: File, userId: string): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error('File size exceeds 3MB limit.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) throw new Error('Avatar upload failed: userId is required.');
  const compressed = await compressImage(file, 0.35, 1024);
  const avatarUrl = await uploadToR2(compressed, 'avatars');
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', trimmedUserId);
  if (error) throw new Error(`Avatar uploaded, but the profile could not be updated: ${error.message}`);
  return avatarUrl;
}
