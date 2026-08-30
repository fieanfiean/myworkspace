import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

export async function uploadCertificateFile(file: File): Promise<string> {
  let fileToUpload = file;

  // 1. 如果是图片，先进行无损/轻量压缩
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 0.8,             // 限制体积在 800KB 以内
      maxWidthOrHeight: 1920,     // 限制分辨率在 1080p
      useWebWorker: true,
    };
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.warn('图片压缩失败，将直接上传原图:', error);
    }
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
