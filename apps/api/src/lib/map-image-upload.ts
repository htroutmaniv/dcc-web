import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import {
  MAP_UPLOAD_URL_PREFIX,
  mapUploadDir,
  mapUploadPathFromUrl,
} from './storage-paths.js';

export const MAX_MAP_IMAGE_BYTES = 4_000_000;

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function extensionForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  throw new Error(`Unsupported image type: ${mime}`);
}

/** Validate bytes, persist as `{mapId}-{sha256}.{ext}`, atomically replace prior file. */
export async function saveMapImageBuffer(
  mapId: string,
  buffer: Buffer,
  existingImageUrl: string | null,
): Promise<{ imageUrl: string; filename: string }> {
  if (buffer.length === 0) {
    throw new Error('Image file is empty');
  }
  if (buffer.length > MAX_MAP_IMAGE_BYTES) {
    throw new Error('Image too large (max 4MB)');
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    throw new Error('Invalid image file: must be PNG, JPEG, or WebP');
  }

  const hash = createHash('sha256').update(buffer).digest('hex');
  const ext = extensionForMime(detected.mime);
  const filename = `${mapId}-${hash}.${ext}`;
  const dir = mapUploadDir();
  await mkdir(dir, { recursive: true });
  const finalPath = path.join(dir, filename);

  if (!existsSync(finalPath)) {
    const tmpPath = path.join(dir, `${filename}.tmp`);
    await writeFile(tmpPath, buffer);
    await rename(tmpPath, finalPath);
  }

  const previousPath = mapUploadPathFromUrl(existingImageUrl);
  if (previousPath && previousPath !== finalPath) {
    await unlink(previousPath).catch(() => {});
  }

  return {
    imageUrl: `${MAP_UPLOAD_URL_PREFIX}${filename}`,
    filename,
  };
}
