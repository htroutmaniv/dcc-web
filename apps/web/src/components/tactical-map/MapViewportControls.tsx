import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';

interface MapViewportControlsProps {
  canZoomOut?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export function MapViewportControls({
  canZoomOut = true,
  onZoomIn,
  onZoomOut,
  onResetView,
}: MapViewportControlsProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        right: 10,
        top: 10,
        zIndex: 3,
        bgcolor: 'rgba(12, 10, 8, 0.92)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 0.5,
      }}
    >
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Tooltip title="Zoom in">
          <IconButton size="small" onClick={onZoomIn}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out">
          <span>
            <IconButton size="small" onClick={onZoomOut} disabled={!canZoomOut}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Fit map to window">
          <IconButton size="small" onClick={onResetView}>
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
