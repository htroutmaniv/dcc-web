import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { getActiveLightItemId, listLightSourceOptions } from '@dcc-web/shared';
import type { Character } from '../../types/game';
import { canExpendLightSource, getConsumableCounts, isUsingLightSource } from '../../utils/consumables';

type CharacterListItemConsumablesProps = {
  character: Character;
  canEditConsumables?: boolean;
  consumableAdjusting?: boolean;
  onOpenConsume?: (kind: 'food' | 'drink') => void;
  onSelectActiveLight?: (lightItemId: string | null) => void;
  onToggleLightLit?: (lit: boolean) => void;
  onExpendActiveLight?: () => void;
};

export function CharacterListItemConsumables({
  character,
  canEditConsumables,
  consumableAdjusting,
  onOpenConsume,
  onSelectActiveLight,
  onToggleLightLit,
  onExpendActiveLight,
}: CharacterListItemConsumablesProps) {
  const counts = getConsumableCounts(character);
  const activeLightId = getActiveLightItemId(character);
  const isLit = isUsingLightSource(character);
  const lightOptions = listLightSourceOptions(character.items ?? []);
  const expendCheck = activeLightId
    ? canExpendLightSource(character.items ?? [], activeLightId)
    : { ok: false as const, message: 'Select a light source' };

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Food {counts.food} · Drink {counts.drink} · Fuel {counts.fuel}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={!canEditConsumables || consumableAdjusting || counts.food <= 0}
          onClick={() => onOpenConsume?.('food')}
          sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
        >
          Eat
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={!canEditConsumables || consumableAdjusting || counts.drink <= 0}
          onClick={() => onOpenConsume?.('drink')}
          sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
        >
          Drink
        </Button>
      </Stack>
      <FormControl
        size="small"
        fullWidth
        disabled={!canEditConsumables || consumableAdjusting || lightOptions.length === 0}
        sx={{ mb: 0.5 }}
      >
        <InputLabel id={`light-${character.id}`}>Light source</InputLabel>
        <Select
          labelId={`light-${character.id}`}
          label="Light source"
          value={activeLightId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onSelectActiveLight?.(v === '' ? null : v);
          }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {lightOptions.map((opt) => (
            <MenuItem key={opt.item.id} value={opt.item.id}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <FormControlLabel
          sx={{ ml: 0, mr: 0 }}
          control={
            <Checkbox
              size="small"
              checked={isLit}
              disabled={!canEditConsumables || consumableAdjusting || !activeLightId}
              onChange={(e) => onToggleLightLit?.(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Lit
            </Typography>
          }
        />
        <Button
          size="small"
          variant="outlined"
          color="warning"
          disabled={
            !canEditConsumables || consumableAdjusting || !activeLightId || !expendCheck.ok
          }
          onClick={() => onExpendActiveLight?.()}
          sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
          title={expendCheck.ok ? undefined : expendCheck.message}
        >
          Expend
        </Button>
      </Stack>
      {lightOptions.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Add a torch or lantern + fuel in Manage equipment.
        </Typography>
      )}
      {activeLightId && !expendCheck.ok && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {expendCheck.message}
        </Typography>
      )}
    </Box>
  );
}
