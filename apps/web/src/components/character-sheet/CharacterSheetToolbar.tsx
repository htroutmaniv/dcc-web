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
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import type { Character, User } from '../../types/game';
import { getActiveWeapon, weaponStatsFromItem } from '../../utils/weapons';

interface CharacterSheetToolbarProps {
  character: Character;
  isDead: boolean;
  vitalityLabel: string | null;
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onClose: () => void;
  isDm?: boolean;
  dmUserId?: string;
  players?: User[];
  onAssignOwner: (ownerUserId: string) => void;
  onRevive?: (characterId: string) => void;
  onMarkDead?: (characterId: string) => void;
  onArchive?: (characterId: string) => void;
}

export function CharacterSheetToolbar({
  character,
  isDead,
  vitalityLabel,
  canEdit,
  editing,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onClose,
  isDm,
  dmUserId,
  players = [],
  onAssignOwner,
  onRevive,
  onMarkDead,
  onArchive,
}: CharacterSheetToolbarProps) {
  const activeWeapon = getActiveWeapon(character);
  const weaponSummary = activeWeapon
    ? (() => {
        const { attackBonus, damage } = weaponStatsFromItem(activeWeapon);
        const ab =
          attackBonus !== 0
            ? ` ${attackBonus >= 0 ? '+' : ''}${attackBonus}`
            : '';
        return `${activeWeapon.name} (${damage}${ab} atk)`;
      })()
    : null;

  return (
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
            HP {character.combat?.hpCurrent ?? '—'} / max {character.combat?.hpMax ?? '—'}
            {vitalityLabel && (
              <>
                {' · '}
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
            {' · '}
            AC {character.combat?.ac ?? '—'}
            {weaponSummary && (
              <>
                {' · '}
                {weaponSummary}
              </>
            )}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {canEdit && !editing && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={onStartEdit}
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
                onClick={onSave}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={onCancelEdit}
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

      {isDm && dmUserId && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" alignItems="center">
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ alignSelf: 'center', mr: 0.5 }}
          >
            DM:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="char-assign-label">Assigned to</InputLabel>
            <Select
              labelId="char-assign-label"
              label="Assigned to"
              value={character.ownerUserId ?? dmUserId}
              onChange={(e) => onAssignOwner(e.target.value)}
              disabled={saving || editing}
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
          </FormControl>
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
  );
}
