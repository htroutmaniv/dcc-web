import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  parseRollTargetFromReason,
  stripRollTargetTag,
  type RollTargetType,
} from '@dcc-web/shared';
import type { GameMonsterInstance } from '@dcc-web/shared';
import type { Character } from '../types/game';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import {
  initialApplyDamageTab,
  resolveDefaultTargetLabel,
  type ApplyDamageTargetTab,
} from '../utils/apply-damage-dialog';
import { ApplyDamageTargetLists } from './ApplyDamageTargetLists';

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
  const [tab, setTab] = useState<ApplyDamageTargetTab>('pc');
  const amount = roll?.total ?? 0;

  useEffect(() => {
    if (!open) return;
    setTab(initialApplyDamageTab(defaultTarget));
  }, [open, defaultTarget?.type, defaultTarget?.id]);

  const defaultLabel = useMemo(
    () => resolveDefaultTargetLabel(defaultTarget, characters, monsters, npcTokens),
    [defaultTarget, characters, monsters, npcTokens],
  );

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
          onChange={(_, v) => setTab(v as ApplyDamageTargetTab)}
          variant="fullWidth"
          sx={{ mb: 1, minHeight: 36 }}
        >
          <Tab label="PCs" value="pc" sx={{ minHeight: 36 }} />
          <Tab label="Monsters" value="monster" sx={{ minHeight: 36 }} />
          <Tab label="NPCs" value="npc" sx={{ minHeight: 36 }} />
        </Tabs>
        <ApplyDamageTargetLists
          tab={tab}
          characters={characters}
          monsters={monsters}
          npcTokens={npcTokens}
          applying={applying}
          isDefault={isDefault}
          onPick={handlePick}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={applying}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
