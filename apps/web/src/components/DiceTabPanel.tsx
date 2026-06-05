import {
  Alert,
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
import type { DiceTrayCounts } from '@dcc-web/shared';
import type { Character, DiceResult } from '../types/game';
import {
  CHARACTER_QUICK_ROLL_SECTIONS,
  getCharacterRollSpec,
  type CharacterRollKind,
} from '../utils/character-rolls';
import { DiceTray } from './DiceTray';

interface DiceTabPanelProps {
  characters: Character[];
  diceCharacterId: string | null;
  onDiceCharacterIdChange: (id: string | null) => void;
  counts: DiceTrayCounts;
  onCountsChange: (counts: DiceTrayCounts) => void;
  onRollTray: () => void;
  onResetTray: () => void;
  onQuickRoll: (kind: CharacterRollKind) => void;
  lastRoll: DiceResult | null;
  rolling?: boolean;
  quickRollKind?: CharacterRollKind | null;
}

export function DiceTabPanel({
  characters,
  diceCharacterId,
  onDiceCharacterIdChange,
  counts,
  onCountsChange,
  onRollTray,
  onResetTray,
  onQuickRoll,
  lastRoll,
  rolling = false,
  quickRollKind = null,
}: DiceTabPanelProps) {
  const diceCharacter = characters.find((c) => c.id === diceCharacterId);
  const hasCharacter = characters.length > 0;

  return (
    <Box>
      <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
        <InputLabel id="dice-character-label">Character</InputLabel>
        <Select
          labelId="dice-character-label"
          label="Character"
          value={diceCharacterId ?? ''}
          onChange={(e) => onDiceCharacterIdChange(e.target.value || null)}
          disabled={!hasCharacter}
        >
          {characters.length === 0 && (
            <MenuItem value="" disabled>
              No characters
            </MenuItem>
          )}
          {characters.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
              {c.status === 'dead' ? ' (dead)' : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ flex: '1 1 48%', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
            Dice pool
          </Typography>
          <DiceTray
            counts={counts}
            onCountsChange={onCountsChange}
            onRoll={onRollTray}
            onReset={onResetTray}
            rolling={rolling}
            compact
          />
        </Box>

        <Box sx={{ flex: '1 1 52%', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
            Character rolls
          </Typography>
          {!diceCharacter ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Add a character to use sheet-based rolls.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {CHARACTER_QUICK_ROLL_SECTIONS.map((section) => (
                <Box key={section.title}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    display="block"
                    sx={{ mb: 0.25 }}
                  >
                    {section.title}
                  </Typography>
                  <Stack spacing={0.5}>
                    {section.rolls.map(({ kind, label }) => {
                      const spec = getCharacterRollSpec(diceCharacter, kind);
                      const isLoading = rolling && quickRollKind === kind;
                      return (
                        <Button
                          key={kind}
                          size="small"
                          variant="outlined"
                          fullWidth
                          disabled={rolling}
                          onClick={() => onQuickRoll(kind)}
                          sx={{
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            py: 0.35,
                            fontSize: '0.75rem',
                          }}
                        >
                          <span>{label}</span>
                          <span style={{ opacity: 0.85 }}>
                            {isLoading ? (
                              <CircularProgress size={12} />
                            ) : (
                              spec.hint
                            )}
                          </span>
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {lastRoll && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            {lastRoll.total}
          </Typography>
          <Typography variant="caption" component="div">
            {lastRoll.notation}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            [{lastRoll.rolls.join(', ')}]
            {lastRoll.modifier !== 0 &&
              ` ${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier}`}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
