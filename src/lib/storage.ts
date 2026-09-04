import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

export const MAX_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;

async function compressImage(file: File, maxSizeMB: number, maxWidthOrHeight: number): Promise<File> {
  try {
    return await imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true });
  } catch (error) {
    console.warn('Image compression failed; uploading the original file.', error);
    return file;
  }
}

function errorMetadata(error: unknown): { message: string; details: unknown } {
  if (typeof error !== 'object' || error === null) return { message: String(error), details: undefined };
  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === 'string' ? record.message : String(error),
    details: record.details,
  };
}

function logSupabaseError(context: string, error: unknown): void {
  const { message, details } = errorMetadata(error);
  console.error(context, { error, message, details });
}

export async function uploadCertificateFile(file: File): Promise<string> {
  let fileToUpload = file;

  // 1. 如果是图片，先进行无损/轻量压缩
  if (file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file, 0.8, 1920);
  }

  // 2. 拼接防重名的文件名
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `achievements/${fileName}`;

  // 3. 上传文件到 Supabase Storage 'certificates' 桶
  const { error } = await supabase.storage
    .from('certificates')
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`);
  }

  // 4. 获取并返回公开可访问的 URL
  const { data: publicUrlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function uploadProfileAvatar(file: File, userId: string): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error('File size exceeds 3MB limit');
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) throw new Error('Avatar upload failed: userId is required.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');

  const safeUserId = trimmedUserId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeUserId) throw new Error('Avatar upload failed: userId contains no valid path characters.');
  const compressed = await compressImage(file, 0.35, 1024);
  const rawExtension = compressed.name.split('.').pop() || 'jpg';
  const safeExtension = rawExtension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const safeFileName = `${Date.now()}_${crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')}.${safeExtension}`;
  const filePath = `profile-avatars/${safeUserId}/${safeFileName}`;
  let avatarUrl: string;

  try {
    const { error: storageError } = await supabase.storage.from('certificates').upload(filePath, compressed, { cacheControl: '3600', upsert: false });
    if (storageError) throw storageError;
    avatarUrl = supabase.storage.from('certificates').getPublicUrl(filePath).data.publicUrl;
  } catch (error) {
    logSupabaseError('Profile avatar Storage upload failed.', error);
    const { message } = errorMetadata(error);
    throw new Error(`Storage bucket upload failed: ${message}`, { cause: error });
  }

  try {
    const { error: databaseError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', trimmedUserId);
    if (databaseError) throw databaseError;
  } catch (error) {
    logSupabaseError('Profile avatar Database update failed.', error);
    const { message } = errorMetadata(error);
    throw new Error(`Database avatar_url update failed: ${message}`, { cause: error });
  }

  return avatarUrl;
}
