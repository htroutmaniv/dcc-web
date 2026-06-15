import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { isActiveInPlay } from '@dcc-web/shared';
import type { Character } from '../../types/game';

type CharacterListItemInitiativeRowProps = {
  character: Character;
  inPlayDisabled: boolean;
  canToggleInPlay?: boolean;
  onToggleInPlay?: (active: boolean) => void;
  canToggleMapToken?: boolean;
  mapTokenVisible?: boolean;
  mapTokenBusy?: boolean;
  onToggleMapToken?: (visible: boolean) => void;
  showTurnHighlight: boolean;
  canEndTurn?: boolean;
  onEndTurn?: () => void;
  endingTurn?: boolean;
};

export function CharacterListItemInitiativeRow({
  character,
  inPlayDisabled,
  canToggleInPlay,
  onToggleInPlay,
  canToggleMapToken,
  mapTokenVisible,
  mapTokenBusy,
  onToggleMapToken,
  showTurnHighlight,
  canEndTurn,
  onEndTurn,
  endingTurn,
}: CharacterListItemInitiativeRowProps) {
  const inPlay = isActiveInPlay(character);
  const isDead = character.status === 'dead';

  return (
    <Stack spacing={0} onClick={(e) => e.stopPropagation()}>
      <FormControlLabel
        sx={{ ml: 0, alignItems: 'center', display: 'flex' }}
        control={
          <Checkbox
            size="small"
            checked={inPlay}
            disabled={!canToggleInPlay || isDead || inPlayDisabled}
            onChange={(e) => onToggleInPlay?.(e.target.checked)}
          />
        }
        label={
          <Typography variant="caption" color="text.secondary">
            In play
          </Typography>
        }
      />
      {canToggleMapToken && (
        <FormControlLabel
          sx={{ ml: 0, alignItems: 'center', display: 'flex' }}
          control={
            <Checkbox
              size="small"
              checked={mapTokenVisible}
              disabled={mapTokenBusy || inPlayDisabled}
              onChange={(e) => onToggleMapToken?.(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Show on map
            </Typography>
          }
        />
      )}
      {showTurnHighlight && (
        <Typography
          variant="caption"
          sx={{ color: 'warning.main', fontWeight: 800, display: 'block', mb: 0.5 }}
        >
          Active turn
        </Typography>
      )}
      {canEndTurn && (
        <Button
          size="small"
          variant="contained"
          color="warning"
          fullWidth
          sx={{ mb: 0.75, py: 0.35, fontSize: '0.72rem' }}
          disabled={endingTurn}
          onClick={() => onEndTurn?.()}
        >
          {endingTurn ? <CircularProgress size={14} color="inherit" /> : 'End turn'}
        </Button>
      )}
    </Stack>
  );
}
