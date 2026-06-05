import { Box, Button, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import StopIcon from '@mui/icons-material/Stop';
import type { GameInitiativeState } from '@dcc-web/shared';

interface DmControlPanelProps {
  initiative: GameInitiativeState | null;
  onStartInitiative: () => void;
  onAdvanceTurn: () => void;
  onEndInitiative: () => void;
  busy?: boolean;
}

export function DmControlPanel({
  initiative,
  onStartInitiative,
  onAdvanceTurn,
  onEndInitiative,
  busy = false,
}: DmControlPanelProps) {
  const active = initiative?.active ?? false;

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        DM controls
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Combat & initiative
      </Typography>

      <Stack spacing={1} sx={{ mt: 0.5 }}>
        {!active && (
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={onStartInitiative}
            disabled={busy}
          >
            Start initiative
          </Button>
        )}
        {active && (
          <>
            <Typography variant="caption" color="text.secondary">
              Round {initiative?.round ?? 1}
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<SkipNextIcon />}
              onClick={onAdvanceTurn}
              disabled={busy}
            >
              Next turn
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<StopIcon />}
              onClick={onEndInitiative}
              disabled={busy}
            >
              End combat
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
