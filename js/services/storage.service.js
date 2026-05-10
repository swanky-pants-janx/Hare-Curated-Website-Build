import { supabase } from '../lib/supabase-client.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
const MAX_PDF_SIZE = 20 * 1024 * 1024;   // 20 MB

function validateFile(file, allowedTypes, maxSize) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)} MB`);
  }
}

// Generate a unique file path: bucket/folder/timestamp-filename
function buildPath(folder, file) {
  const ext = file.name.split('.').pop();
  const base = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 40);
  return `${folder}/${Date.now()}-${base}.${ext}`;
}

export async function uploadImage(bucket, folder, file) {
  validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
  const path = buildPath(folder, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPDF(bucket, folder, file) {
  validateFile(file, ALLOWED_PDF_TYPES, MAX_PDF_SIZE);
  const path = buildPath(folder, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// Extract the storage path from a full public URL.
export function extractPath(publicUrl) {
  try {
    const url = new URL(publicUrl);
    // Path format: /storage/v1/object/public/<bucket>/<path>
    const parts = url.pathname.split('/');
    const bucketIndex = parts.indexOf('public') + 1;
    return parts.slice(bucketIndex + 1).join('/');
  } catch {
    return null;
  }
}
