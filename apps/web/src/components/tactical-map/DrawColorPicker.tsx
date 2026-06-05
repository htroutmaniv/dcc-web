import { useEffect, useState } from 'react';
import { Box, Popover, Stack, TextField, Tooltip } from '@mui/material';

const DRAW_COLOR_PRESETS = [
  '#c9a227',
  '#e85d5d',
  '#4a90d9',
  '#50c878',
  '#f5f5f5',
  '#9b59b6',
  '#ff8c00',
  '#00ced1',
  '#2ecc71',
  '#e91e63',
  '#1a1a1a',
  '#ffffff',
];

interface DrawColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function DrawColorPicker({ color, onChange }: DrawColorPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hexDraft, setHexDraft] = useState(color);
  const open = Boolean(anchor);

  useEffect(() => {
    setHexDraft(color);
  }, [color]);

  return (
    <>
      <Tooltip title="Draw color">
        <Box
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            width: 22,
            height: 22,
            borderRadius: 1,
            bgcolor: color,
            border: 2,
            borderColor: 'primary.main',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.25, width: 168 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.75,
              mb: 1,
            }}
          >
            {DRAW_COLOR_PRESETS.map((preset) => (
              <Box
                key={preset}
                onClick={() => {
                  onChange(preset);
                  setAnchor(null);
                }}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: preset,
                  border: 2,
                  borderColor: color.toLowerCase() === preset.toLowerCase() ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              component="label"
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                cursor: 'pointer',
                flexShrink: 0,
                '& input': {
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'none',
                },
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
              />
            </Box>
            <TextField
              size="small"
              value={hexDraft}
              onChange={(e) => {
                const next = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(next)) setHexDraft(next);
              }}
              onBlur={() => {
                if (/^#[0-9A-Fa-f]{6}$/.test(hexDraft)) onChange(hexDraft);
                else setHexDraft(color);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && /^#[0-9A-Fa-f]{6}$/.test(hexDraft)) {
                  onChange(hexDraft);
                  setAnchor(null);
                }
              }}
              placeholder="#rrggbb"
              slotProps={{ htmlInput: { sx: { fontFamily: 'monospace', fontSize: '0.8rem' } } }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
