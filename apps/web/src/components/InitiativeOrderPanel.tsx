import { Box, Typography } from '@mui/material';
import {
  getCurrentTurnEntry,
  type GameInitiativeState,
} from '@dcc-web/shared';

interface InitiativeOrderPanelProps {
  initiative: GameInitiativeState | null;
}

export function InitiativeOrderPanel({ initiative }: InitiativeOrderPanelProps) {
  if (!initiative?.active || initiative.order.length === 0) return null;

  const current = getCurrentTurnEntry(initiative);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        maxWidth: 280,
        bgcolor: 'rgba(18, 16, 14, 0.92)',
        border: '1px solid',
        borderColor: 'primary.dark',
        borderRadius: 1,
        p: 1.25,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <Typography
        variant="caption"
        color="primary.main"
        fontWeight={800}
        display="block"
        sx={{ mb: 0.75 }}
      >
        Initiative · Round {initiative.round}
      </Typography>
      <Box component="ol" sx={{ m: 0, pl: 2.25 }}>
        {initiative.order.map((entry, index) => {
          const isCurrent = current?.entryId === entry.entryId;
          return (
            <Box
              component="li"
              key={entry.entryId}
              sx={{
                py: 0.2,
                listStylePosition: 'outside',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isCurrent ? 800 : 500,
                  color: isCurrent ? 'primary.main' : 'text.primary',
                  fontSize: '0.8rem',
                }}
              >
                {index + 1}. {entry.name}
                <Box component="span" sx={{ opacity: 0.75, ml: 0.5 }}>
                  ({entry.initiative}
                  {entry.d20Roll != null && entry.modifier != null
                    ? ` · ${entry.d20Roll}${entry.modifier >= 0 ? '+' : ''}${entry.modifier}`
                    : ''}
                  )
                </Box>
                {isCurrent && (
                  <Box
                    component="span"
                    sx={{ ml: 0.5, color: 'warning.main', fontWeight: 800 }}
                  >
                    ◀
                  </Box>
                )}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
