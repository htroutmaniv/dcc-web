import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import {
  MAP_UPLOAD_URL_PREFIX,
  mapUploadDir,
  mapUploadFilePath,
  mapUploadPathFromUrl,
} from '../src/lib/storage-paths.js';

describe('storage-paths', () => {
  test('mapUploadDir resolves under storagePath/maps', () => {
    expect(mapUploadDir()).toBe(path.resolve(process.cwd(), './data/uploads', 'maps'));
  });

  test('mapUploadFilePath uses basename only', () => {
    expect(mapUploadFilePath('../evil.png')).toBe(
      path.join(mapUploadDir(), 'evil.png'),
    );
  });

  test('mapUploadPathFromUrl returns null for non-local URLs', () => {
    expect(mapUploadPathFromUrl('https://example.com/x.png')).toBeNull();
    expect(mapUploadPathFromUrl(null)).toBeNull();
  });

  test('mapUploadPathFromUrl resolves local map uploads', () => {
    const url = `${MAP_UPLOAD_URL_PREFIX}abc.png`;
    expect(mapUploadPathFromUrl(url)).toBe(mapUploadFilePath('abc.png'));
  });
});
