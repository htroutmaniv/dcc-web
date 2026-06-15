/** Resolve whether an attack roll hits a target AC (DCC: meet or beat AC). */

export function getTargetAc(combat?: { ac?: number } | null): number {
  const ac = combat?.ac;
  return typeof ac === 'number' && Number.isFinite(ac) ? ac : 10;
}

export function attackRollHits(
  attackTotal: number,
  targetAc: number,
  naturalRoll?: number,
): boolean {
  if (naturalRoll === 1) return false;
  if (naturalRoll === 20) return true;
  return attackTotal >= targetAc;
}
