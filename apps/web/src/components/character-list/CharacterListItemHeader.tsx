import { Box, Typography } from '@mui/material';
import {
  formatCharacterVitalityBadge,
  getCharacterVitality,
} from '@dcc-web/shared';
import type { Character } from '../../types/game';
import { isUsingLightSource } from '../../utils/consumables';

type CharacterListItemHeaderProps = {
  character: Character;
  onSelect: () => void;
};

export function CharacterListItemHeader({ character, onSelect }: CharacterListItemHeaderProps) {
  const hpNum =
    typeof character.combat?.hpCurrent === 'number' ? character.combat.hpCurrent : null;
  const hpMaxNum =
    typeof character.combat?.hpMax === 'number' ? character.combat.hpMax : null;
  const hpCurrent = hpNum ?? '—';
  const hpMax = hpMaxNum ?? '—';
  const ac = character.combat?.ac ?? '—';
  const vitality = getCharacterVitality({
    level: character.level,
    status: character.status,
    combat: character.combat,
  });
  const vitalityLabel = formatCharacterVitalityBadge({
    level: character.level,
    status: character.status,
    combat: character.combat,
  });
  const isDead = vitality === 'dead' || character.status === 'dead';
  const isDying = vitality === 'dying';
  const hpColor = isDead ? 'error.main' : isDying ? 'warning.main' : 'text.secondary';
  const isLit = isUsingLightSource(character);

  return (
    <Box
      onClick={onSelect}
      sx={{ cursor: 'pointer', minWidth: 0 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <Typography
        variant="body1"
        fontWeight={600}
        noWrap
        sx={{ color: isDead ? 'error.main' : 'text.primary' }}
      >
        {character.name}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, color: hpColor }}>
        HP {hpCurrent}/{hpMax}
        {vitalityLabel && (
          <>
            <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
              ·
            </Box>
            <Box
              component="span"
              sx={{
                color: isDead ? 'error.main' : 'warning.main',
                fontWeight: 700,
              }}
            >
              {vitalityLabel}
            </Box>
          </>
        )}
        <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
          ·
        </Box>
        AC {ac}
        {isLit && (
          <>
            <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
              ·
            </Box>
            <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
              Lit
            </Box>
          </>
        )}
      </Typography>
    </Box>
  );
}

export function getCharacterListItemShellSx(
  showTurnHighlight: boolean,
  selected?: boolean,
) {
  return {
    borderRadius: 1,
    mb: 0.5,
    py: 1.25,
    px: 1.5,
    border: 2,
    borderColor: showTurnHighlight
      ? 'warning.main'
      : selected
        ? 'primary.main'
        : 'divider',
    bgcolor: showTurnHighlight
      ? 'rgba(201, 162, 39, 0.12)'
      : selected
        ? 'action.selected'
        : 'transparent',
    boxShadow: showTurnHighlight ? '0 0 12px rgba(201, 162, 39, 0.35)' : 'none',
  } as const;
}
