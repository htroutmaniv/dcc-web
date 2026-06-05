import { useEffect, useMemo, useState } from 'react';

import {

  Box,

  Button,

  Dialog,

  DialogActions,

  DialogContent,

  DialogTitle,

  List,

  ListItemButton,

  ListItemText,

  Tab,

  Tabs,

  Typography,

} from '@mui/material';

import {
  isMonsterKilled,
  parseRollTargetFromReason,
  stripRollTargetTag,
  type RollTargetType,
} from '@dcc-web/shared';

import type { GameMonsterInstance } from '@dcc-web/shared';

import type { Character } from '../types/game';

import type { DiceRollLogEntry } from '../types/dice-roll-log';



export interface MapTokenTarget {

  id: string;

  label: string;

  kind: string;

  hpCurrent?: number | null;

  hpMax?: number | null;

}



interface ApplyDamageDialogProps {

  open: boolean;

  roll: DiceRollLogEntry | null;

  characters: Character[];

  monsters: GameMonsterInstance[];

  npcTokens: MapTokenTarget[];

  onClose: () => void;

  onApply: (

    targetType: 'character' | 'monster' | 'npc',

    targetId: string,

    amount: number,

  ) => Promise<void>;

  applying?: boolean;

}



type TargetTab = 'pc' | 'monster' | 'npc';



function tabForTargetType(type: RollTargetType): TargetTab {

  if (type === 'character') return 'pc';

  if (type === 'monster') return 'monster';

  return 'npc';

}



export function ApplyDamageDialog({

  open,

  roll,

  characters,

  monsters,

  npcTokens,

  onClose,

  onApply,

  applying,

}: ApplyDamageDialogProps) {

  const defaultTarget = useMemo(

    () => parseRollTargetFromReason(roll?.reason),

    [roll?.reason],

  );

  const [tab, setTab] = useState<TargetTab>('pc');

  const amount = roll?.total ?? 0;



  useEffect(() => {

    if (!open) return;

    if (defaultTarget) {

      setTab(tabForTargetType(defaultTarget.type));

    } else {

      setTab('monster');

    }

  }, [open, defaultTarget?.type, defaultTarget?.id]);



  const livingPcs = useMemo(

    () => characters.filter((c) => c.status === 'alive'),

    [characters],

  );

  const livingMonsters = useMemo(

    () => monsters.filter((m) => m.hpCurrent > 0 && !isMonsterKilled(m)),

    [monsters],

  );



  const defaultLabel = useMemo(() => {

    if (!defaultTarget) return null;

    if (defaultTarget.type === 'character') {

      return characters.find((c) => c.id === defaultTarget.id)?.name ?? null;

    }

    if (defaultTarget.type === 'monster') {

      return monsters.find((m) => m.id === defaultTarget.id)?.name ?? null;

    }

    return npcTokens.find((t) => t.id === defaultTarget.id)?.label ?? null;

  }, [defaultTarget, characters, monsters, npcTokens]);



  const isDefault = (type: RollTargetType, id: string) =>

    defaultTarget?.type === type && defaultTarget.id === id;



  const handlePick = (targetType: 'character' | 'monster' | 'npc', targetId: string) => {

    void onApply(targetType, targetId, amount);

  };



  const applyDefault = () => {

    if (!defaultTarget) return;

    void onApply(defaultTarget.type, defaultTarget.id, amount);

  };



  return (

    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>

      <DialogTitle>Apply damage</DialogTitle>

      <DialogContent>

        {roll && (

          <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>

            Apply <strong>{amount}</strong> damage from:{' '}
            {stripRollTargetTag(roll.reason) || roll.notation}

          </Typography>

        )}

        {defaultTarget && defaultLabel && (

          <Button

            fullWidth

            variant="contained"

            color="error"

            disabled={applying}

            onClick={applyDefault}

            sx={{ mb: 2 }}

          >

            Apply to {defaultLabel} (from roll)

          </Button>

        )}

        <Tabs

          value={tab}

          onChange={(_, v) => setTab(v as TargetTab)}

          variant="fullWidth"

          sx={{ mb: 1, minHeight: 36 }}

        >

          <Tab label="PCs" value="pc" sx={{ minHeight: 36 }} />

          <Tab label="Monsters" value="monster" sx={{ minHeight: 36 }} />

          <Tab label="NPCs" value="npc" sx={{ minHeight: 36 }} />

        </Tabs>



        {tab === 'pc' && (

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

                    onClick={() => handlePick('character', c.id)}

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

        )}



        {tab === 'monster' && (

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

                    onClick={() => handlePick('monster', m.id)}

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

        )}



        {tab === 'npc' && (

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

                      onClick={() => handlePick('npc', t.id)}

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

        )}

      </DialogContent>

      <DialogActions>

        <Button onClick={onClose} disabled={applying}>

          Cancel

        </Button>

      </DialogActions>

    </Dialog>

  );

}

