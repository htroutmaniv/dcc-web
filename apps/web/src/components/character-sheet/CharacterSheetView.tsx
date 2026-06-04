import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Character } from '../../types/game';
import {
  isLevel0Sheet,
  mapCharacterToLevel0Sheet,
  sheetDataToCharacterPatch,
  type Level0SheetData,
} from '../../utils/character-sheet';
import { formatError } from '../../utils/errors';
import { Level0CharacterSheet } from './Level0CharacterSheet';

interface CharacterSheetViewProps {
  character: Character;
  onClose: () => void;
  /** Called after a successful save; optional for backwards compatibility */
  onCharacterUpdated?: (character: Character) => void;
  onRevive?: (characterId: string) => void;
  onArchive?: (characterId: string) => void;
  onMarkDead?: (characterId: string) => void;
  isDm?: boolean;
}

export function CharacterSheetView({
  character: characterProp,
  onClose,
  onCharacterUpdated,
  onRevive,
  onArchive,
  onMarkDead,
  isDm,
}: CharacterSheetViewProps) {
  const { user } = useAuth();
  const [character, setCharacter] = useState(characterProp);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Level0SheetData>(() =>
    mapCharacterToLevel0Sheet(characterProp),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDead = character.status === 'dead';

  const canEdit =
    isDm || (user != null && character.ownerUserId === user.id);

  useEffect(() => {
    setCharacter(characterProp);
    setDraft(mapCharacterToLevel0Sheet(characterProp));
    setEditing(false);
    setError(null);
  }, [characterProp]);

  const startEdit = () => {
    setDraft(mapCharacterToLevel0Sheet(character));
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraft(mapCharacterToLevel0Sheet(character));
    setEditing(false);
    setError(null);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = sheetDataToCharacterPatch(draft, character);
      const res = await api<{ character: Character } | Character>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      const updated =
        res && typeof res === 'object' && 'character' in res
          ? res.character
          : (res as Character);
      if (!updated?.id) {
        throw new Error('Save succeeded but no character was returned');
      }
      setCharacter(updated);
      setDraft(mapCharacterToLevel0Sheet(updated));
      onCharacterUpdated?.(updated);
      setEditing(false);
    } catch (e) {
      setError(formatError(e));
      if (e instanceof ApiError && e.status === 403) {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [draft, character, onCharacterUpdated]);

  const sheet = (
    <Level0CharacterSheet
      data={draft}
      editing={editing}
      onChange={setDraft}
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: '#12100e',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontFamily="Cinzel, serif"
              sx={{ color: isDead ? 'error.main' : 'text.primary' }}
            >
              {character.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: isDead ? 'error.main' : 'text.secondary' }}
            >
              HP {character.combat?.hpCurrent ?? '—'}/{character.combat?.hpMax ?? '—'}
              {' · '}
              AC {character.combat?.ac ?? '—'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {canEdit && !editing && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={startEdit}
              >
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={
                    saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                  }
                  onClick={() => void save()}
                  disabled={saving}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelIcon />}
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="small"
              startIcon={<CloseIcon />}
              onClick={onClose}
              color="inherit"
              disabled={saving}
            >
              Back to map
            </Button>
          </Stack>
        </Box>

        {isDm && (onRevive || onMarkDead || onArchive) && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: 'center', mr: 0.5 }}
            >
              DM:
            </Typography>
            {character.status === 'dead' && onRevive && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => onRevive(character.id)}
                disabled={saving || editing}
              >
                Revive
              </Button>
            )}
            {character.status === 'alive' && onMarkDead && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={() => onMarkDead(character.id)}
                disabled={saving || editing}
              >
                Kill
              </Button>
            )}
            {onArchive && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => onArchive(character.id)}
                disabled={saving || editing}
              >
                Remove from game
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 1, sm: 2, md: 3 },
          display: 'flex',
          justifyContent: 'center',
          bgcolor: '#3a342c',
        }}
      >
        {isLevel0Sheet(character) ? (
          sheet
        ) : (
          <Box sx={{ maxWidth: 960, width: '100%' }}>
            <Typography variant="h6" gutterBottom fontFamily="Cinzel, serif" color="text.primary">
              {character.name}
            </Typography>
            <Typography color="text.secondary" paragraph>
              Level {character.level} {character.className} — class layout coming soon.
            </Typography>
            {sheet}
          </Box>
        )}
      </Box>
    </Box>
  );
}
