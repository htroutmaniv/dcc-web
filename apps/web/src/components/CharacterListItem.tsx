import { Box, Button, Stack, Typography } from '@mui/material';
import type { GameInitiativeState } from '@dcc-web/shared';
import type { Character } from '../types/game';
import type { DiceResult } from '../types/game';
import type { CombatRollKind } from '../utils/character-rolls';
import type { CombatTargetOption } from '../utils/combat-target-options';
import { CharacterListItemCombatBar } from './character-list/CharacterListItemCombatBar';
import { CharacterListItemConsumables } from './character-list/CharacterListItemConsumables';
import {
  CharacterListItemHeader,
  getCharacterListItemShellSx,
} from './character-list/CharacterListItemHeader';
import { CharacterListItemInitiativeRow } from './character-list/CharacterListItemInitiativeRow';

export type { CombatTargetOption } from '../utils/combat-target-options';
export { buildCombatTargetOptions } from '../utils/combat-target-options';

interface CharacterListItemProps {
  character: Character;
  selected?: boolean;
  onSelect: () => void;
  onCombatRoll: (kind: CombatRollKind) => void;
  onPatchHp?: (hpCurrent: number) => void;
  canEditHp?: boolean;
  hpAdjusting?: boolean;
  onSelectWeapon?: (weaponId: string) => void;
  combatTargets?: CombatTargetOption[];
  attackTargetId?: string;
  onAttackTargetChange?: (targetId: string | null) => void;
  onOpenConsume?: (kind: 'food' | 'drink') => void;
  onSelectActiveLight?: (lightItemId: string | null) => void;
  onToggleLightLit?: (lit: boolean) => void;
  onExpendActiveLight?: () => void;
  consumableAdjusting?: boolean;
  canEditConsumables?: boolean;
  canToggleInPlay?: boolean;
  onToggleInPlay?: (active: boolean) => void;
  mapTokenVisible?: boolean;
  canToggleMapToken?: boolean;
  mapTokenBusy?: boolean;
  onToggleMapToken?: (visible: boolean) => void;
  initiative?: GameInitiativeState | null;
  initiativeActive?: boolean;
  isInitiativeTurn?: boolean;
  canEndTurn?: boolean;
  onEndTurn?: () => void;
  endingTurn?: boolean;
  rollingKind?: CombatRollKind | null;
  lastRoll?: DiceResult | null;
}

export function CharacterListItem({
  character,
  selected,
  onSelect,
  onCombatRoll,
  onPatchHp,
  canEditHp,
  hpAdjusting,
  onSelectWeapon,
  combatTargets = [],
  attackTargetId = '',
  onAttackTargetChange,
  onOpenConsume,
  onSelectActiveLight,
  onToggleLightLit,
  onExpendActiveLight,
  consumableAdjusting,
  canEditConsumables,
  canToggleInPlay,
  onToggleInPlay,
  mapTokenVisible = false,
  canToggleMapToken = false,
  mapTokenBusy = false,
  onToggleMapToken,
  initiative,
  initiativeActive,
  isInitiativeTurn,
  canEndTurn,
  onEndTurn,
  endingTurn,
  rollingKind,
  lastRoll,
}: CharacterListItemProps) {
  const hpNum =
    typeof character.combat?.hpCurrent === 'number' ? character.combat.hpCurrent : null;
  const hpMaxNum =
    typeof character.combat?.hpMax === 'number' ? character.combat.hpMax : null;
  const canAdjustHp = Boolean(canEditHp && onPatchHp && hpNum !== null && hpMaxNum !== null);
  const showTurnHighlight = Boolean(initiativeActive && isInitiativeTurn);
  const inPlayDisabled = Boolean(consumableAdjusting || hpAdjusting);

  return (
    <Box sx={getCharacterListItemShellSx(showTurnHighlight, selected)}>
      <CharacterListItemHeader character={character} onSelect={onSelect} />

      {canAdjustHp && (
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="center"
          sx={{ mt: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="small"
            sx={{ minWidth: 24, px: 0.25, py: 0 }}
            disabled={hpAdjusting}
            onClick={() => onPatchHp!(hpNum! - 1)}
          >
            −
          </Button>
          <Typography variant="caption" sx={{ minWidth: 52, textAlign: 'center' }}>
            {hpNum}/{hpMaxNum}
          </Typography>
          <Button
            size="small"
            sx={{ minWidth: 24, px: 0.25, py: 0 }}
            disabled={hpAdjusting || hpNum! >= hpMaxNum!}
            onClick={() => onPatchHp!(hpNum! + 1)}
          >
            +
          </Button>
        </Stack>
      )}

      <Box sx={{ mt: 0.75 }}>
        <CharacterListItemInitiativeRow
          character={character}
          inPlayDisabled={inPlayDisabled}
          canToggleInPlay={canToggleInPlay}
          onToggleInPlay={onToggleInPlay}
          canToggleMapToken={canToggleMapToken}
          mapTokenVisible={mapTokenVisible}
          mapTokenBusy={mapTokenBusy}
          onToggleMapToken={onToggleMapToken}
          showTurnHighlight={showTurnHighlight}
          canEndTurn={canEndTurn}
          onEndTurn={onEndTurn}
          endingTurn={endingTurn}
        />
      </Box>

      <Box sx={{ mt: 0.5 }}>
        <CharacterListItemConsumables
          character={character}
          canEditConsumables={canEditConsumables}
          consumableAdjusting={consumableAdjusting}
          onOpenConsume={onOpenConsume}
          onSelectActiveLight={onSelectActiveLight}
          onToggleLightLit={onToggleLightLit}
          onExpendActiveLight={onExpendActiveLight}
        />
      </Box>

      <CharacterListItemCombatBar
        character={character}
        initiative={initiative}
        initiativeActive={initiativeActive}
        combatTargets={combatTargets}
        attackTargetId={attackTargetId}
        onSelectWeapon={onSelectWeapon}
        onAttackTargetChange={onAttackTargetChange}
        onCombatRoll={onCombatRoll}
        consumableAdjusting={consumableAdjusting}
        rollingKind={rollingKind}
        lastRoll={lastRoll}
      />
    </Box>
  );
}
