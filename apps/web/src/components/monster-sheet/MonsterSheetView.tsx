import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import {
  defaultMonsterSheet,
  parseMonsterSheet,
  type GameMonsterInstance,
  type MonsterAttack,
  type MonsterSheetData,
} from '@dcc-web/shared';
import { api } from '../../api/client';
import { formatError } from '../../utils/errors';

interface MonsterSheetViewProps {
  gameId: string;
  monster: GameMonsterInstance;
  onClose: () => void;
  onMonsterUpdated: (monster: GameMonsterInstance) => void;
}

export function MonsterSheetView({
  gameId,
  monster: initial,
  onClose,
  onMonsterUpdated,
}: MonsterSheetViewProps) {
  const [monster, setMonster] = useState(initial);
  const [sheet, setSheet] = useState<MonsterSheetData>(() =>
    parseMonsterSheet(initial.sheet),
  );
  const [hpCurrent, setHpCurrent] = useState(initial.hpCurrent);
  const [hpMax, setHpMax] = useState(initial.hpMax);
  const [ac, setAc] = useState(initial.ac);
  const [notes, setNotes] = useState(initial.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMonster(initial);
    setSheet(parseMonsterSheet(initial.sheet));
    setHpCurrent(initial.hpCurrent);
    setHpMax(initial.hpMax);
    setAc(initial.ac);
    setNotes(initial.notes);
  }, [initial]);

  const updateAttack = (index: number, patch: Partial<MonsterAttack>) => {
    setSheet((prev) => ({
      ...prev,
      attacks: prev.attacks.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const addAttack = () => {
    setSheet((prev) => ({
      ...prev,
      attacks: [
        ...prev.attacks,
        {
          id: `atk-${Date.now()}`,
          name: 'Attack',
          attackBonus: 0,
          damage: '1d6',
        },
      ],
    }));
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const primary = sheet.attacks[0];
      const { monster: updated } = await api<{ monster: GameMonsterInstance }>(
        `/games/${gameId}/monsters/${monster.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            hpCurrent,
            hpMax,
            ac,
            notes,
            sheet,
            attackBonus: primary?.attackBonus,
            damage: primary?.damage,
          }),
        },
      );
      setMonster(updated);
      onMonsterUpdated(updated);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSaving(false);
    }
  }, [gameId, monster.id, sheet, hpCurrent, hpMax, ac, notes, onMonsterUpdated]);

  const items = monster.items ?? [];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: 'background.default',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="h6">{monster.name}</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={() => void save()}
            disabled={saving}
          >
            Save
          </Button>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <TextField
            label="HP current"
            type="number"
            size="small"
            value={hpCurrent}
            onChange={(e) => setHpCurrent(Number(e.target.value))}
            sx={{ width: 100 }}
          />
          <TextField
            label="HP max"
            type="number"
            size="small"
            value={hpMax}
            onChange={(e) => setHpMax(Number(e.target.value))}
            sx={{ width: 100 }}
          />
          <TextField
            label="AC"
            type="number"
            size="small"
            value={ac}
            onChange={(e) => setAc(Number(e.target.value))}
            sx={{ width: 80 }}
          />
          <TextField
            label="Init mod"
            type="number"
            size="small"
            value={monster.initMod}
            disabled
            sx={{ width: 90 }}
          />
          <TextField
            label="Speed"
            type="number"
            size="small"
            value={monster.speed}
            disabled
            sx={{ width: 90 }}
          />
        </Stack>

        <Typography variant="subtitle2" gutterBottom>
          Attacks
        </Typography>
        {sheet.attacks.map((atk, i) => (
          <Stack key={atk.id} direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <TextField
              label="Name"
              size="small"
              value={atk.name}
              onChange={(e) => updateAttack(i, { name: e.target.value })}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="+Hit"
              size="small"
              type="number"
              value={atk.attackBonus}
              onChange={(e) => updateAttack(i, { attackBonus: Number(e.target.value) })}
              sx={{ width: 72 }}
            />
            <TextField
              label="Damage"
              size="small"
              value={atk.damage}
              onChange={(e) => updateAttack(i, { damage: e.target.value })}
              sx={{ width: 100 }}
            />
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addAttack} sx={{ mb: 2 }}>
          Add attack
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Special abilities
        </Typography>
        {(sheet.specialAbilities.length ? sheet.specialAbilities : defaultMonsterSheet().specialAbilities).map(
          (ab, i) => (
            <Stack key={i} spacing={1} sx={{ mb: 1 }}>
              <TextField
                label="Ability"
                size="small"
                value={ab.name}
                onChange={(e) => {
                  const next = [...sheet.specialAbilities];
                  next[i] = { ...ab, name: e.target.value };
                  setSheet((p) => ({ ...p, specialAbilities: next }));
                }}
              />
              <TextField
                label="Description"
                size="small"
                multiline
                minRows={2}
                value={ab.description}
                onChange={(e) => {
                  const next = [...sheet.specialAbilities];
                  next[i] = { ...ab, description: e.target.value };
                  setSheet((p) => ({ ...p, specialAbilities: next }));
                }}
              />
            </Stack>
          ),
        )}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() =>
            setSheet((p) => ({
              ...p,
              specialAbilities: [...p.specialAbilities, { name: '', description: '' }],
            }))
          }
          sx={{ mb: 2 }}
        >
          Add ability
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Loot & equipment
        </Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No items (rolled from loot pool on spawn, if assigned).
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {items.map((item) => (
              <Typography key={item.id} variant="body2">
                {item.name} ×{item.quantity}
                {item.notes ? ` — ${item.notes}` : ''}
              </Typography>
            ))}
          </Stack>
        )}

        <TextField
          label="Notes"
          multiline
          minRows={3}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
        />
      </Box>
    </Box>
  );
}
