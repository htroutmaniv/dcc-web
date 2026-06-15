import { describe, expect, test } from 'bun:test';
import { AUDIT_KINDS } from '../src/services/audit-service.js';

describe('AUDIT_KINDS', () => {
  test('defines stable kind strings for route hooks', () => {
    expect(AUDIT_KINDS.characterStatus).toBe('character.status_change');
    expect(AUDIT_KINDS.inventoryTransfer).toBe('inventory.transfer');
    expect(AUDIT_KINDS.mapClear).toBe('map.clear');
  });
});
