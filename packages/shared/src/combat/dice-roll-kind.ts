export const DICE_ROLL_KINDS = [
  'unspecified',
  'attack',
  'damage',
  'save',
  'ability',
  'initiative',
  'other',
] as const;

export type DiceRollKind = (typeof DICE_ROLL_KINDS)[number];

export function normalizeRollKind(value: unknown): DiceRollKind {
  if (typeof value === 'string' && DICE_ROLL_KINDS.includes(value as DiceRollKind)) {
    return value as DiceRollKind;
  }
  return 'unspecified';
}

/** Infer roll category from reason text when kind not sent explicitly. */
export function inferRollKind(reason?: string, explicit?: DiceRollKind): DiceRollKind {
  if (explicit) return explicit;
  const r = (reason ?? '').toLowerCase();
  if (r.includes('damage')) return 'damage';
  if (r.includes('attack') || r.includes(' vs ')) return 'attack';
  if (r.includes('initiative')) return 'initiative';
  if (r.includes('save')) return 'save';
  if (r.includes('check')) return 'ability';
  if (r.includes('table roll')) return 'unspecified';
  return 'unspecified';
}

/** MUI / CSS color for roll tracker rows. */
export function rollKindTextColor(kind: DiceRollKind): string {
  switch (kind) {
    case 'attack':
      return '#ffb74d';
    case 'damage':
      return '#ef5350';
    case 'save':
      return '#4fc3f7';
    case 'ability':
      return '#ce93d8';
    case 'initiative':
      return '#fff176';
    case 'other':
      return '#b0bec5';
    default:
      return '#f5f5f5';
  }
}

export function rollKindLabel(kind: DiceRollKind): string {
  switch (kind) {
    case 'attack':
      return 'Attack';
    case 'damage':
      return 'Damage';
    case 'save':
      return 'Save';
    case 'ability':
      return 'Ability';
    case 'initiative':
      return 'Initiative';
    case 'other':
      return 'Other';
    default:
      return 'Roll';
  }
}
