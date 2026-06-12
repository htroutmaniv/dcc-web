/** Machine-readable target tag appended to dice roll reasons. */

export type RollTargetType = 'character' | 'monster' | 'npc';

const TARGET_TAG_RE = /\[\[target:(character|monster|npc):([0-9a-f-]{36})\]\]/i;
const OUTCOME_RE = /—\s*(HIT|MISS)\s*(?:\[\[target:|$)/i;

export function formatRollTargetTag(type: RollTargetType, id: string): string {
  return `[[target:${type}:${id}]]`;
}

export function parseRollTargetFromReason(
  reason?: string | null,
): { type: RollTargetType; id: string } | null {
  if (!reason) return null;
  const m = reason.match(TARGET_TAG_RE);
  if (!m) return null;
  return { type: m[1] as RollTargetType, id: m[2]! };
}

export function stripRollTargetTag(reason?: string | null): string {
  if (!reason) return '';
  return reason.replace(TARGET_TAG_RE, '').replace(/\s+/g, ' ').trim();
}

export function parseAttackOutcome(reason?: string | null): 'hit' | 'miss' | null {
  if (!reason) return null;
  const m = reason.match(OUTCOME_RE);
  if (!m) return null;
  return m[1]!.toUpperCase() === 'HIT' ? 'hit' : 'miss';
}

export function formatAttackOutcomeLabel(outcome: 'hit' | 'miss'): string {
  return outcome === 'hit' ? 'HIT' : 'MISS';
}

/** Remove `(AC N)` from roll log display text (monster targets only). */
export function stripMonsterAcFromDisplay(text: string): string {
  return text.replace(/\s*\(AC\s+\d+\)/i, '');
}
