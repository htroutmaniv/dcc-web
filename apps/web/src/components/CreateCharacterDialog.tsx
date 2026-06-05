import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import EditIcon from '@mui/icons-material/Edit';
import { createCharacterSchema, DCC_CHARACTER_CLASSES } from '@dcc-web/shared';
import type { z } from 'zod';
import type { User } from '../types/game';

export type CreateCharacterPayload = z.infer<typeof createCharacterSchema>;

interface CreateCharacterDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCharacterPayload) => Promise<void>;
  submitting?: boolean;
  isDm?: boolean;
  players?: User[];
  dmUserId?: string;
}

const LEVELS = Array.from({ length: 11 }, (_, i) => i);

export function CreateCharacterDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
  isDm = false,
  players = [],
  dmUserId,
}: CreateCharacterDialogProps) {
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [level, setLevel] = useState(0);
  const [className, setClassName] = useState('');
  const [name, setName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [noElves, setNoElves] = useState(false);
  const [noDwarves, setNoDwarves] = useState(false);
  const [noHalflings, setNoHalflings] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('random');
    setLevel(0);
    setClassName('');
    setName('');
    setOwnerUserId(dmUserId ?? players[0]?.id ?? '');
    setNoElves(false);
    setNoDwarves(false);
    setNoHalflings(false);
  }, [open, players, dmUserId]);

  const showClass = level > 0;
  const showRaceFilters = mode === 'random';

  const ownerField = isDm && dmUserId ? { ownerUserId: ownerUserId || dmUserId } : {};

  const buildPayload = (): CreateCharacterPayload => {
    if (mode === 'manual') {
      return {
        mode: 'manual',
        level,
        ...ownerField,
        ...(showClass && className ? { className } : {}),
        ...(name.trim() ? { name: name.trim() } : {}),
      };
    }
    return {
      mode: 'random',
      level,
      ...ownerField,
      ...(showClass && className ? { className } : {}),
      noElves,
      noDwarves,
      noHalflings,
    };
  };

  const handleSubmit = async () => {
    await onSubmit(buildPayload());
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add character</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          fullWidth
          size="small"
          sx={{ mt: 1, mb: 2 }}
          onChange={(_, v) => {
            if (v) setMode(v as 'random' | 'manual');
          }}
        >
          <ToggleButton value="random">
            <CasinoIcon fontSize="small" sx={{ mr: 0.5 }} />
            Random
          </ToggleButton>
          <ToggleButton value="manual">
            <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
            Manual
          </ToggleButton>
        </ToggleButtonGroup>

        {isDm && dmUserId && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="char-owner-label">Assigned to</InputLabel>
            <Select
              labelId="char-owner-label"
              label="Assigned to"
              value={ownerUserId || dmUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
            >
              <MenuItem value={dmUserId}>NPC (DM)</MenuItem>
              {players
                .filter((p) => p.id !== dmUserId)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.displayName}
                  </MenuItem>
                ))}
            </Select>
            <FormHelperText>
              Unassigned characters stay with the DM as NPCs. Assign to a player for their sheet.
            </FormHelperText>
          </FormControl>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="char-level-label">Level</InputLabel>
          <Select
            labelId="char-level-label"
            label="Level"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {LEVELS.map((l) => (
              <MenuItem key={l} value={l}>
                {l === 0 ? '0 (funnel)' : l}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {level === 0
              ? 'Funnel peasants use occupation instead of class.'
              : 'Leveled characters use a DCC class.'}
          </FormHelperText>
        </FormControl>

        {showClass && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="char-class-label">Class</InputLabel>
            <Select
              labelId="char-class-label"
              label="Class"
              value={className}
              displayEmpty
              onChange={(e) => setClassName(e.target.value)}
            >
              <MenuItem value="">
                <em>{mode === 'random' ? 'Random class' : 'Choose later (Warrior default)'}</em>
              </MenuItem>
              {DCC_CHARACTER_CLASSES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {mode === 'manual' && (
          <TextField
            fullWidth
            size="small"
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New Character"
            sx={{ mb: 2 }}
          />
        )}

        {showRaceFilters && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Random generation — exclude races
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={noElves}
                    onChange={(e) => setNoElves(e.target.checked)}
                  />
                }
                label="No elves"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={noDwarves}
                    onChange={(e) => setNoDwarves(e.target.checked)}
                  />
                }
                label="No dwarves"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={noHalflings}
                    onChange={(e) => setNoHalflings(e.target.checked)}
                  />
                }
                label="No halflings"
              />
            </FormGroup>
            <FormHelperText sx={{ mx: 0 }}>
              Filters funnel occupations (0-level) and Elf/Dwarf/Halfling classes when level &gt; 0.
            </FormHelperText>
          </Box>
        )}

        {mode === 'random' && (
          <Typography variant="caption" color="text.secondary" display="block">
            Dice are rolled on the server using DCC-style rules (3d6 abilities, funnel table, etc.).
          </Typography>
        )}
        {mode === 'manual' && (
          <Typography variant="caption" color="text.secondary" display="block">
            Creates a blank sheet you can edit — no random rolls.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Creating…' : mode === 'random' ? 'Roll character' : 'Create character'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
