import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import GridOnIcon from '@mui/icons-material/GridOn';
import UploadIcon from '@mui/icons-material/Upload';
import HideImageIcon from '@mui/icons-material/HideImage';
import GestureIcon from '@mui/icons-material/Gesture';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import NearMeIcon from '@mui/icons-material/NearMe';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  MAP_GRID_PRESETS,
  type MapDrawTool,
  type MapGridPreset,
} from '@dcc-web/shared';
import type { TacticalGameMap } from '../../types/map';

interface MapToolbarProps {
  maps: TacticalGameMap[];
  activeMapId: string | null;
  drawTool: MapDrawTool;
  drawColor: string;
  busy?: boolean;
  onDrawToolChange: (tool: MapDrawTool) => void;
  onDrawColorChange: (color: string) => void;
  onSelectMap: (mapId: string) => void;
  onPrevMap: () => void;
  onNextMap: () => void;
  onAddMap: () => void;
  onDeleteMap: () => void;
  onToggleVisible: () => void;
  onGridPresetChange: (preset: MapGridPreset) => void;
  onUploadImage: (file: File) => void;
  onRemoveImage: () => void;
  onSyncTokens: () => void;
  onLayoutTokens: () => void;
  onClearDrawings: () => void;
}

const DRAW_COLORS = ['#c9a227', '#e85d5d', '#4a90d9', '#50c878', '#f5f5f5'];

export function MapToolbar({
  maps,
  activeMapId,
  drawTool,
  drawColor,
  busy,
  onDrawToolChange,
  onDrawColorChange,
  onSelectMap,
  onPrevMap,
  onNextMap,
  onAddMap,
  onDeleteMap,
  onToggleVisible,
  onGridPresetChange,
  onUploadImage,
  onRemoveImage,
  onSyncTokens,
  onLayoutTokens,
  onClearDrawings,
}: MapToolbarProps) {
  const active = maps.find((m) => m.id === activeMapId) ?? null;
  const visibleMaps = maps.filter((m) => m.visible);

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'rgba(12, 10, 8, 0.95)',
        px: 1,
        py: 0.75,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Stack direction="row" spacing={0.25} alignItems="center">
          <IconButton size="small" onClick={onPrevMap} disabled={busy || maps.length < 2}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="map-select">Map</InputLabel>
            <Select
              labelId="map-select"
              label="Map"
              value={activeMapId ?? ''}
              onChange={(e) => onSelectMap(e.target.value)}
              sx={{ fontSize: '0.85rem' }}
            >
              {maps.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                  {!m.visible ? ' (hidden)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton size="small" onClick={onNextMap} disabled={busy || maps.length < 2}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <Tooltip title="Add map">
            <IconButton size="small" onClick={onAddMap} disabled={busy}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete map">
            <IconButton size="small" color="error" onClick={onDeleteMap} disabled={busy || maps.length <= 1}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={active?.visible ? 'Hide map from players' : 'Show map to players'}>
            <IconButton size="small" onClick={onToggleVisible} disabled={busy || !active}>
              {active?.visible ? (
                <VisibilityIcon fontSize="small" />
              ) : (
                <VisibilityOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="grid-preset">Grid scale</InputLabel>
          <Select
            labelId="grid-preset"
            label="Grid scale"
            value={(active?.gridPreset as MapGridPreset) ?? 'tactical'}
            onChange={(e) => onGridPresetChange(e.target.value as MapGridPreset)}
            disabled={busy || !active}
            sx={{ fontSize: '0.85rem' }}
          >
            {Object.values(MAP_GRID_PRESETS).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={drawTool}
          onChange={(_, v) => v && onDrawToolChange(v as MapDrawTool)}
        >
          <ToggleButton value="select">
            <NearMeIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="freehand">
            <GestureIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="circle">
            <CircleOutlinedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="rect">
            <CropSquareIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={0.25} alignItems="center">
          {DRAW_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => onDrawColorChange(c)}
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: c,
                border: 2,
                borderColor: drawColor === c ? 'primary.main' : 'transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </Stack>

        <Button
          size="small"
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
          disabled={busy || !active}
        >
          Upload
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadImage(f);
              e.target.value = '';
            }}
          />
        </Button>
        {active?.imageUrl && (
          <Tooltip title="Remove background image">
            <IconButton size="small" onClick={onRemoveImage} disabled={busy}>
              <HideImageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Button size="small" variant="outlined" startIcon={<SyncIcon />} onClick={onSyncTokens} disabled={busy}>
          Sync chips
        </Button>
        <Tooltip title="Arrange chips in a grid at the upper-right of the visible map area">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<GridOnIcon />}
              onClick={onLayoutTokens}
              disabled={busy || !active}
            >
              Reset layout
            </Button>
          </span>
        </Tooltip>
        <Button size="small" variant="text" onClick={onClearDrawings} disabled={busy}>
          Clear draw
        </Button>
      </Stack>
      {visibleMaps.length === 0 && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
          All maps hidden from players.
        </Typography>
      )}
    </Box>
  );
}
