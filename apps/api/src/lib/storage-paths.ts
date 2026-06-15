import path from 'node:path';
import { config } from './config.js';

/** Public URL prefix for map images (served by the API). */
export const MAP_UPLOAD_URL_PREFIX = '/uploads/maps/';

/** Absolute directory for map image files on disk. */
export function mapUploadDir(): string {
  return path.resolve(process.cwd(), config.storagePath, 'maps');
}

/** Resolve a map upload filename to an absolute path (basename only). */
export function mapUploadFilePath(filename: string): string {
  return path.join(mapUploadDir(), path.basename(filename));
}

/** Absolute path for a stored map image URL, or null when the URL is not a local map upload. */
export function mapUploadPathFromUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.startsWith(MAP_UPLOAD_URL_PREFIX)) return null;
  return mapUploadFilePath(path.basename(imageUrl));
}
