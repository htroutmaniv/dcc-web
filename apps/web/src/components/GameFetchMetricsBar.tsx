import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { getFullListFetchMetrics, resetFullListFetchMetrics } from '../utils/game-fetch-metrics';

/** DM-only strip: counts full-list GETs since reset (patches should not increment). */
export function GameFetchMetricsBar() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => refresh((n) => n + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  const { counts, total } = getFullListFetchMetrics();

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        Full list fetches: {total} (detail {counts.detail}, chars {counts.characters}, monsters{' '}
        {counts.monsters}, maps {counts.maps}, dice {counts.diceRolls})
      </Typography>
      <Button size="small" sx={{ mt: 0.25, p: 0, minWidth: 0 }} onClick={resetFullListFetchMetrics}>
        Reset counter
      </Button>
    </Box>
  );
}
