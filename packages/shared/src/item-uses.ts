/** Per-item use tracking (torches, oil flasks, wands, vessel drinks, etc.). */

export interface ItemUsesState {
  /** Uses per quantity unit (default 1). */
  uses: number;
  /** Uses left on the current partial unit; full stack = (qty - 1) * uses + usesRemaining. */
  usesRemaining?: number;
}

export function usesPerUnit(properties?: Record<string, unknown>): number {
  const u = properties?.uses;
  if (typeof u === 'number' && u > 0) return Math.floor(u);
  return 1;
}

export function readItemUsesState(
  item: { quantity: number; properties?: Record<string, unknown> },
): ItemUsesState {
  const uses = usesPerUnit(item.properties);
  const raw = item.properties?.usesRemaining;
  const usesRemaining =
    typeof raw === 'number' && raw >= 0 ? Math.floor(raw) : undefined;
  return { uses, usesRemaining };
}

/** Total uses available on this inventory row. */
export function getStackUsesAvailable(item: {
  quantity: number;
  properties?: Record<string, unknown>;
}): number {
  const { uses, usesRemaining } = readItemUsesState(item);
  const qty = Math.max(0, item.quantity);
  if (usesRemaining != null) {
    return Math.max(0, (qty - 1) * uses + usesRemaining);
  }
  return qty * uses;
}

/** After consuming `units` uses from a stack-style item row. */
export function applyStackUsesConsume(
  item: { quantity: number; properties?: Record<string, unknown> },
  units: number,
): { quantity: number; properties: Record<string, unknown> } | null {
  const props = { ...(item.properties ?? {}) };
  const per = usesPerUnit(props);
  let total = getStackUsesAvailable(item) - units;
  if (total <= 0) return null;

  const newQty = Math.max(1, Math.ceil(total / per));
  const newRem = total - (newQty - 1) * per;
  props.uses = per;
  props.usesRemaining = newRem;
  return { quantity: newQty, properties: props };
}

export function formatStackUsesSummary(item: {
  quantity: number;
  properties?: Record<string, unknown>;
}): string {
  const available = getStackUsesAvailable(item);
  const per = usesPerUnit(item.properties);
  if (per > 1) {
    return `${available} use${available === 1 ? '' : 's'} (${per}/each, ×${item.quantity})`;
  }
  return available === 1 ? '×1' : `×${available}`;
}
