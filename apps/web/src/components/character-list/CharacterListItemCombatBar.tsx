import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  parseAttackOutcome,
  stripRollTargetTag,
  type GameInitiativeState,
} from '@dcc-web/shared';
import type { Character } from '../../types/game';
import type { DiceResult } from '../../types/game';
import type { CombatRollKind } from '../../utils/character-rolls';
import {
  formatWeaponLabel,
  getWeaponItems,
  resolveSelectedWeaponId,
} from '../../utils/weapons';
import type { CombatTargetOption } from '../../utils/combat-target-options';

const ROLL_BUTTONS: { kind: CombatRollKind; label: string }[] = [
  { kind: 'initiative', label: 'Init' },
  { kind: 'toHit', label: 'Hit' },
  { kind: 'damage', label: 'Dmg' },
];

function shouldShowInitiativeQuickRoll(
  state: GameInitiativeState | null,
  characterId: string,
): boolean {
  if (!state?.active) return true;
  return !state.order.some(
    (entry) => entry.kind === 'character' && entry.characterId === characterId,
  );
}

type CharacterListItemCombatBarProps = {
  character: Character;
  initiative?: GameInitiativeState | null;
  initiativeActive?: boolean;
  combatTargets?: CombatTargetOption[];
  attackTargetId?: string;
  onSelectWeapon?: (weaponId: string) => void;
  onAttackTargetChange?: (targetId: string | null) => void;
  onCombatRoll: (kind: CombatRollKind) => void;
  consumableAdjusting?: boolean;
  rollingKind?: CombatRollKind | null;
  lastRoll?: DiceResult | null;
};

export function CharacterListItemCombatBar({
  character,
  initiative,
  initiativeActive,
  combatTargets = [],
  attackTargetId = '',
  onSelectWeapon,
  onAttackTargetChange,
  onCombatRoll,
  consumableAdjusting,
  rollingKind,
  lastRoll,
}: CharacterListItemCombatBarProps) {
  const isRolling = rollingKind != null;
  const weapons = getWeaponItems(character);
  const selectedWeaponId = resolveSelectedWeaponId(character) ?? '';
  const showCombatTargets = initiativeActive && combatTargets.length > 0;
  const lastOutcome = lastRoll?.reason ? parseAttackOutcome(lastRoll.reason) : null;
  const visibleRollButtons = ROLL_BUTTONS.filter(
    ({ kind }) =>
      kind !== 'initiative' || shouldShowInitiativeQuickRoll(initiative ?? null, character.id),
  );

  return (
    <>
      {weapons.length > 0 && (
        <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <FormControl size="small" fullWidth disabled={consumableAdjusting}>
            <InputLabel id={`weapon-${character.id}`}>Weapon</InputLabel>
            <Select
              labelId={`weapon-${character.id}`}
              label="Weapon"
              value={selectedWeaponId}
              onChange={(e) => onSelectWeapon?.(e.target.value)}
            >
              {weapons.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {formatWeaponLabel(w)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {showCombatTargets && (
        <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <FormControl size="small" fullWidth disabled={isRolling}>
            <InputLabel id={`atk-tgt-${character.id}`}>Attack target</InputLabel>
            <Select
              labelId={`atk-tgt-${character.id}`}
              label="Attack target"
              value={attackTargetId}
              onChange={(e) => onAttackTargetChange?.(e.target.value || null)}
            >
              <MenuItem value="">
                <em>Select target</em>
              </MenuItem>
              {combatTargets.map((t) => (
                <MenuItem key={`${t.type}-${t.id}`} value={`${t.type}:${t.id}`}>
                  {t.label} (AC {t.ac})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Stack
        direction="row"
        spacing={0.5}
        sx={{ mt: 1 }}
        flexWrap="wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {visibleRollButtons.map(({ kind, label }) => {
          const needsTarget =
            initiativeActive && (kind === 'toHit' || kind === 'damage') && combatTargets.length > 0;
          const disabled = isRolling || (needsTarget && !attackTargetId);
          return (
            <Button
              key={kind}
              size="small"
              variant="outlined"
              disabled={disabled}
              onClick={() => onCombatRoll(kind)}
              sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
            >
              {rollingKind === kind ? <CircularProgress size={12} /> : label}
            </Button>
          );
        })}
      </Stack>

      {lastRoll && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            display: 'block',
            color:
              lastOutcome === 'hit'
                ? 'success.main'
                : lastOutcome === 'miss'
                  ? 'error.main'
                  : 'success.main',
          }}
        >
          <strong>{lastRoll.total}</strong> (
          {stripRollTargetTag(lastRoll.reason ?? '') || lastRoll.notation})
          {lastOutcome === 'hit' && (
            <Box component="span" sx={{ ml: 0.5, fontWeight: 800 }}>
              Success
            </Box>
          )}
          {lastOutcome === 'miss' && (
            <Box component="span" sx={{ ml: 0.5, fontWeight: 800 }}>
              Failure
            </Box>
          )}
        </Typography>
      )}
    </>
  );
}
