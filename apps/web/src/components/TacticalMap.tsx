import { Box, Typography } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';

interface TacticalMapProps {
  gridFtPerCell?: number;
  isDm?: boolean;
}

/** Placeholder for react-konva map — upload, tokens, movement radius. */
export function TacticalMap({ gridFtPerCell = 5, isDm }: TacticalMapProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: '#0d0b09',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `
          linear-gradient(rgba(201, 162, 39, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(201, 162, 39, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'text.secondary',
        }}
      >
        <GridOnIcon fontSize="small" />
        <Typography variant="caption">
          Tactical map · {gridFtPerCell}&apos; grid · {isDm ? 'DM tools coming soon' : 'View only'}
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ px: 2 }}>
          Map canvas (upload, tokens, movement radius) will render here.
        </Typography>
      </Box>
    </Box>
  );
}
