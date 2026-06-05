import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import GridOnIcon from '@mui/icons-material/GridOn';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
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
import { DrawColorPicker } from './DrawColorPicker';

interface MapToolbarProps {
  maps: TacticalGameMap[];
  activeMapId: string | null;
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  busy?: boolean;
  onDrawToolChange: (tool: MapDrawTool) => void;
  onDrawColorChange: (color: string) => void;
  onDrawStrokeWidthChange: (width: number) => void;
  onImageScaleChange: (scale: number) => void;
  onSelectMap: (mapId: string) => void;
  onPrevMap: () => void;
  onNextMap: () => void;
  onAddMap: () => void;
  onDeleteMap: () => void;
  onToggleVisible: () => void;
  onGridPresetChange: (preset: MapGridPreset) => void;
  onUploadImage: (file: File) => void;
  onRemoveImage: () => void;
  onRenameMap: (name: string) => void;
  onLayoutTokens: () => void;
  onClearDrawings: () => void;
}

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];

export function MapToolbar({
  maps,
  activeMapId,
  drawTool,
  drawColor,
  drawStrokeWidth,
  busy,
  onDrawToolChange,
  onDrawColorChange,
  onDrawStrokeWidthChange,
  onImageScaleChange,
  onSelectMap,
  onPrevMap,
  onNextMap,
  onAddMap,
  onDeleteMap,
  onToggleVisible,
  onGridPresetChange,
  onUploadImage,
  onRemoveImage,
  onRenameMap,
  onLayoutTokens,
  onClearDrawings,
}: MapToolbarProps) {
  const active = maps.find((m) => m.id === activeMapId) ?? null;
  const visibleMaps = maps.filter((m) => m.visible);
  const renameAnchorRef = useRef<HTMLButtonElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [imageScaleDraft, setImageScaleDraft] = useState(active?.imageScale ?? 1);

  useEffect(() => {
    setImageScaleDraft(active?.imageScale ?? 1);
  }, [active?.id, active?.imageScale]);

  const openRename = () => {
    setRenameValue(active?.name ?? '');
    setRenameOpen(true);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== active?.name) onRenameMap(trimmed);
    setRenameOpen(false);
  };

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
          <Tooltip title="Rename map">
            <IconButton
              ref={renameAnchorRef}
              size="small"
              onClick={openRename}
              disabled={busy || !active}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Popover
            open={renameOpen}
            anchorEl={renameAnchorRef.current}
            onClose={() => setRenameOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Stack spacing={1} sx={{ p: 1.5, width: 220 }}>
              <TextField
                size="small"
                label="Map name"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setRenameOpen(false);
                }}
              />
              <Button size="small" variant="contained" onClick={submitRename} disabled={!renameValue.trim()}>
                Save
              </Button>
            </Stack>
          </Popover>
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
          <ToggleButton value="erase">
            <AutoFixOffIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 72 }}>
          <InputLabel id="stroke-width">Width</InputLabel>
          <Select
            labelId="stroke-width"
            label="Width"
            value={drawStrokeWidth}
            onChange={(e) => onDrawStrokeWidthChange(Number(e.target.value))}
            sx={{ fontSize: '0.85rem' }}
          >
            {STROKE_WIDTHS.map((w) => (
              <MenuItem key={w} value={w}>
                {w}px
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {drawTool !== 'erase' && (
          <DrawColorPicker color={drawColor} onChange={onDrawColorChange} />
        )}

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
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 140, px: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Image
              </Typography>
              <Slider
                size="small"
                min={0.25}
                max={3}
                step={0.05}
                value={imageScaleDraft}
                onChange={(_, v) => setImageScaleDraft(v as number)}
                onChangeCommitted={(_, v) => onImageScaleChange(v as number)}
                disabled={busy}
                sx={{ width: 90 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>
                {Math.round(imageScaleDraft * 100)}%
              </Typography>
            </Stack>
            <Tooltip title="Remove background image">
              <IconButton size="small" onClick={onRemoveImage} disabled={busy}>
                <HideImageIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
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
