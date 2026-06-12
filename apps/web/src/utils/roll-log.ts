import {
  inferRollKind,
  parseAttackOutcome,
  parseRollTargetFromReason,
  stripMonsterAcFromDisplay,
  stripRollTargetTag,
  type DiceRollKind,
} from '@dcc-web/shared';
import type { DiceRollLogEntry } from '../types/dice-roll-log';

export function characterRollKindToDiceKind(
  kind: string,
): DiceRollKind {
  if (kind === 'toHit') return 'attack';
  if (kind === 'damage') return 'damage';
  if (kind === 'initiative') return 'initiative';
  if (kind.startsWith('save')) return 'save';
  if (['str', 'agi', 'sta', 'per', 'int', 'lck'].includes(kind)) return 'ability';
  return 'unspecified';
}

export type RollLineDisplay = {
  prefix: string;
  outcome: { text: string; kind: 'hit' | 'miss' } | null;
  suffix: string;
};

export function formatRollLineDisplay(
  entry: DiceRollLogEntry,
  options?: { hideMonsterAc?: boolean; isDm?: boolean },
): RollLineDisplay {
  let label = stripRollTargetTag(entry.reason) || entry.notation;
  const target = parseRollTargetFromReason(entry.reason);
  if (options?.hideMonsterAc && !options.isDm && target?.type === 'monster') {
    label = stripMonsterAcFromDisplay(label);
  }

  const dice =
    entry.rolls.length > 0
      ? `[${entry.rolls.join(', ')}]`
      : '';
  const mod =
    entry.modifier !== 0
      ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}`
      : '';
  const suffix = `→ ${entry.total} ${dice}${mod}`.trim();

  const attackOutcome = entry.rollKind === 'attack' ? parseAttackOutcome(entry.reason) : null;
  if (attackOutcome == null) {
    return { prefix: label, outcome: null, suffix };
  }

  const outcomeSuffix = attackOutcome === 'hit' ? ' · Success' : ' · Failure';
  const hitMissMatch = label.match(/^(.*?)(—\s*(HIT|MISS))\s*$/i);
  if (hitMissMatch) {
    return {
      prefix: hitMissMatch[1]!.trim(),
      outcome: {
        text: `${hitMissMatch[2]!.trim()}${outcomeSuffix}`,
        kind: attackOutcome,
      },
      suffix,
    };
  }

  return {
    prefix: label,
    outcome: {
      text: outcomeSuffix.trim(),
      kind: attackOutcome,
    },
    suffix,
  };
}

export function formatRollLine(entry: DiceRollLogEntry): string {
  const { prefix, outcome, suffix } = formatRollLineDisplay(entry);
  const outcomeText = outcome ? ` ${outcome.text}` : '';
  return `${prefix}${outcomeText} ${suffix}`.replace(/\s+/g, ' ').trim();
}

export function parseRollLogEntry(raw: unknown): DiceRollLogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.total !== 'number') return null;
  return {
    id: o.id,
    notation: String(o.notation ?? ''),
    rolls: Array.isArray(o.rolls) ? o.rolls.map(Number) : [],
    modifier: Number(o.modifier) || 0,
    total: o.total,
    rollKind: inferRollKind(
      typeof o.reason === 'string' ? o.reason : undefined,
      typeof o.rollKind === 'string' ? (o.rollKind as DiceRollKind) : undefined,
    ),
    reason: typeof o.reason === 'string' ? o.reason : undefined,
    characterId: typeof o.characterId === 'string' ? o.characterId : undefined,
    characterName: typeof o.characterName === 'string' ? o.characterName : undefined,
    actorUserId: typeof o.actorUserId === 'string' ? o.actorUserId : undefined,
    actorName: typeof o.actorName === 'string' ? o.actorName : undefined,
    createdAt:
      typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
  };
}
