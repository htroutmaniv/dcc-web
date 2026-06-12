import { Box, Typography } from '@mui/material';
import {
  createCharacterInitiativeSkipFn,
  formatCharacterVitalityBadge,
  getCharacterVitality,
  getCurrentTurnEntry,
  isCharacterInitiativeInactive,
  isMonsterDown,
  isMonsterGroupEntry,
  type GameInitiativeState,
  type GameMonsterInstance,
} from '@dcc-web/shared';
import { useMemo } from 'react';
import type { Character } from '../types/game';

interface InitiativeOrderPanelProps {
  initiative: GameInitiativeState | null;
  characters?: Character[];
  monsters?: GameMonsterInstance[];
}

function entryStatusLabel(
  entry: GameInitiativeState['order'][number],
  characters: Character[],
  monsters: GameMonsterInstance[],
): string | null {
  if (entry.kind === 'character' && entry.characterId) {
    const character = characters.find((c) => c.id === entry.characterId);
    if (!character) return null;
    return formatCharacterVitalityBadge({
      level: character.level,
      status: character.status,
      combat: character.combat,
    });
  }
  if (entry.kind === 'monster' && entry.monsterId) {
    const monster = monsters.find((m) => m.id === entry.monsterId);
    if (!monster) return null;
    if (isMonsterDown(monster)) return 'Killed';
    if (monster.hpCurrent < monster.hpMax) return `${monster.hpCurrent} HP`;
    return null;
  }
  if (
    entry.kind === 'monster_group' ||
    isMonsterGroupEntry(entry)
  ) {
    const active = monsters.filter((m) => !isMonsterDown(m));
    if (active.length === 0 && monsters.length > 0) return 'Killed';
    const wounded = monsters.filter(
      (m) => !isMonsterDown(m) && m.hpCurrent < m.hpMax,
    );
    if (wounded.length > 0) {
      const lowest = Math.min(...wounded.map((m) => m.hpCurrent));
      return lowest <= 0 ? `${lowest} HP` : null;
    }
  }
  return null;
}

export function InitiativeOrderPanel({
  initiative,
  characters = [],
  monsters = [],
}: InitiativeOrderPanelProps) {
  const shouldSkip = useMemo(
    () => createCharacterInitiativeSkipFn(characters),
    [characters],
  );

  if (!initiative?.active || initiative.order.length === 0) return null;

  const current = getCurrentTurnEntry(initiative, shouldSkip);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        maxWidth: 320,
        bgcolor: 'rgba(18, 16, 14, 0.92)',
        border: '1px solid',
        borderColor: 'primary.dark',
        borderRadius: 1,
        p: 1.25,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <Typography
        variant="caption"
        color="primary.main"
        fontWeight={800}
        display="block"
        sx={{ mb: 0.75 }}
      >
        Initiative · Round {initiative.round}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {initiative.order.map((entry, index) => {
          const isCurrent = current?.entryId === entry.entryId;
          const statusLabel = entryStatusLabel(entry, characters, monsters);
          const character =
            entry.kind === 'character' && entry.characterId
              ? characters.find((c) => c.id === entry.characterId)
              : undefined;
          const isInactive =
            character != null && isCharacterInitiativeInactive(character);
          const vitality =
            character != null ? getCharacterVitality(character) : null;
          return (
            <Box
              component="li"
              key={entry.entryId}
              sx={{
                py: 0.2,
                listStylePosition: 'outside',
                opacity: isInactive ? 0.55 : 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isCurrent ? 800 : 500,
                  color: isCurrent
                    ? 'primary.main'
                    : vitality === 'dead'
                      ? 'error.main'
                      : 'text.primary',
                  fontSize: '0.8rem',
                }}
              >
                {index + 1}. {entry.name}
                {(entry.kind === 'monster_group' || isMonsterGroupEntry(entry)) && (
                  <Box
                    component="span"
                    sx={{ ml: 0.35, opacity: 0.65, fontSize: '0.7rem', color: 'secondary.main' }}
                  >
                    (monsters)
                  </Box>
                )}
                <Box component="span" sx={{ opacity: 0.75, ml: 0.5 }}>
                  ({entry.initiative}
                  {entry.d20Roll != null && entry.modifier != null
                    ? ` · ${entry.d20Roll}${entry.modifier >= 0 ? '+' : ''}${entry.modifier}`
                    : ''}
                  )
                </Box>
                {statusLabel && (
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color:
                        statusLabel === 'Killed' ? 'error.main' : 'warning.main',
                    }}
                  >
                    · {statusLabel}
                  </Box>
                )}
                {isCurrent && (
                  <Box
                    component="span"
                    sx={{ ml: 0.5, color: 'warning.main', fontWeight: 800 }}
                  >
                    ◀
                  </Box>
                )}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
