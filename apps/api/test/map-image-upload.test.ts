import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { saveMapImageBuffer } from '../src/lib/map-image-upload.js';

/** Valid 1×1 PNG (magic bytes + structure). */
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000000500010d0a2db40000000049454e44ae426082',
  'hex',
);

describe('saveMapImageBuffer', () => {
  let prevStoragePath: string | undefined;
  let tempDir: string;

  beforeAll(async () => {
    prevStoragePath = process.env.STORAGE_PATH;
    tempDir = await mkdtemp(path.join(tmpdir(), 'dcc-map-upload-'));
    process.env.STORAGE_PATH = tempDir;
  });

  afterAll(async () => {
    process.env.STORAGE_PATH = prevStoragePath;
    await rm(tempDir, { recursive: true, force: true });
  });

  test('writes content-addressed filename and returns map URL', async () => {
    const mapId = '11111111-1111-4111-8111-111111111111';
    const { imageUrl, filename } = await saveMapImageBuffer(mapId, PNG_1X1, null);
    expect(filename).toMatch(/^11111111-1111-4111-8111-111111111111-[a-f0-9]{64}\.png$/);
    expect(imageUrl).toBe(`/uploads/maps/${filename}`);
  });

  test('rejects non-image bytes', async () => {
    await expect(
      saveMapImageBuffer('map-id', Buffer.from('not an image'), null),
    ).rejects.toThrow(/Invalid image file/);
  });

  test('deduplicates identical content (same hash path)', async () => {
    const mapId = '22222222-2222-4222-8222-222222222222';
    const first = await saveMapImageBuffer(mapId, PNG_1X1, null);
    const second = await saveMapImageBuffer(mapId, PNG_1X1, first.imageUrl);
    expect(second.filename).toBe(first.filename);
  });
});
