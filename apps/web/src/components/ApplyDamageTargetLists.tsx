import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { isMonsterKilled, type RollTargetType } from '@dcc-web/shared';
import type { GameMonsterInstance } from '@dcc-web/shared';
import type { Character } from '../types/game';
import type { MapTokenTarget } from './ApplyDamageDialog';
import type { ApplyDamageTargetTab } from '../utils/apply-damage-dialog';

type ApplyDamageTargetListsProps = {
  tab: ApplyDamageTargetTab;
  characters: Character[];
  monsters: GameMonsterInstance[];
  npcTokens: MapTokenTarget[];
  applying?: boolean;
  isDefault: (type: RollTargetType, id: string) => boolean;
  onPick: (targetType: 'character' | 'monster' | 'npc', targetId: string) => void;
};

export function ApplyDamageTargetLists({
  tab,
  characters,
  monsters,
  npcTokens,
  applying,
  isDefault,
  onPick,
}: ApplyDamageTargetListsProps) {
  if (tab === 'pc') {
    const livingPcs = characters.filter((c) => c.status === 'alive');
    return (
      <List dense disablePadding>
        {livingPcs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No alive PCs.
          </Typography>
        ) : (
          livingPcs.map((c) => {
            const hp = c.combat?.hpCurrent ?? c.combat?.hpMax ?? '?';
            const max = c.combat?.hpMax;
            const highlighted = isDefault('character', c.id);
            return (
              <ListItemButton
                key={c.id}
                onClick={() => onPick('character', c.id)}
                disabled={applying}
                selected={highlighted}
                sx={highlighted ? { bgcolor: 'action.selected' } : undefined}
              >
                <ListItemText
                  primary={c.name}
                  secondary={
                    highlighted
                      ? `Default target · ${max != null ? `HP ${hp}/${max}` : `HP ${hp}`}`
                      : max != null
                        ? `HP ${hp}/${max}`
                        : `HP ${hp}`
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
    );
  }

  if (tab === 'monster') {
    const livingMonsters = monsters.filter((m) => m.hpCurrent > 0 && !isMonsterKilled(m));
    return (
      <List dense disablePadding>
        {livingMonsters.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active monsters.
          </Typography>
        ) : (
          livingMonsters.map((m) => {
            const highlighted = isDefault('monster', m.id);
            return (
              <ListItemButton
                key={m.id}
                onClick={() => onPick('monster', m.id)}
                disabled={applying}
                selected={highlighted}
                sx={highlighted ? { bgcolor: 'action.selected' } : undefined}
              >
                <ListItemText
                  primary={m.name}
                  secondary={
                    highlighted
                      ? `Default target · HP ${m.hpCurrent}/${m.hpMax}`
                      : `HP ${m.hpCurrent}/${m.hpMax}`
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
    );
  }

  return (
    <Box>
      {npcTokens.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No NPC tokens on the map. Place NPC tokens to track damage here.
        </Typography>
      ) : (
        <List dense disablePadding>
          {npcTokens.map((t) => {
            const highlighted = isDefault('npc', t.id);
            return (
              <ListItemButton
                key={t.id}
                onClick={() => onPick('npc', t.id)}
                disabled={applying}
                selected={highlighted}
                sx={highlighted ? { bgcolor: 'action.selected' } : undefined}
              >
                <ListItemText
                  primary={t.label}
                  secondary={
                    highlighted
                      ? 'Default target'
                      : t.hpMax != null
                        ? `HP ${t.hpCurrent ?? t.hpMax}/${t.hpMax}`
                        : 'HP not set — will start at damage taken'
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
