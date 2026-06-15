import { describe, expect, test } from 'bun:test';
import { buildInfo } from '../src/lib/build-info.js';

describe('buildInfo', () => {
  test('defaults to single-instance realtime mode', () => {
    expect(buildInfo.realtimeMode).toBe('single-instance');
    expect(buildInfo.version).toBeTruthy();
    expect(buildInfo.gitSha).toBeTruthy();
  });
});
