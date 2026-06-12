import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  rollKindLabel,
  rollKindTextColor,
  type DiceRollKind,
} from '@dcc-web/shared';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import { formatRollLineDisplay } from '../utils/roll-log';
import {
  clampRollLogLayout,
  defaultRollLogLayout,
  loadRollLogLayout,
  rollLogLayoutKey,
  saveRollLogLayout,
  type RollLogPanelLayout,
} from '../utils/roll-log-panel-layout';

interface RollTrackerPanelProps {
  rolls: DiceRollLogEntry[];
  isDm?: boolean;
  hideMonsterAcInRollLog?: boolean;
  gameId?: string;
  containerRef: RefObject<HTMLElement | null>;
  onClear?: () => void;
  onApplyDamage?: (roll: DiceRollLogEntry) => void;
}

export function RollTrackerPanel({
  rolls,
  isDm,
  hideMonsterAcInRollLog = false,
  gameId,
  containerRef,
  onClear,
  onApplyDamage,
}: RollTrackerPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [layout, setLayout] = useState<RollLogPanelLayout | null>(null);
  const layoutRef = useRef<RollLogPanelLayout | null>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; layout: RollLogPanelLayout } | null>(null);

  layoutRef.current = layout;

  const storageKey = gameId ? rollLogLayoutKey(gameId) : null;

  const measureContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    return { width: el.clientWidth, height: el.clientHeight };
  }, [containerRef]);

  const applyLayout = useCallback(
    (next: RollLogPanelLayout, persist = false) => {
      const bounds = measureContainer();
      if (!bounds) return;
      const clamped = clampRollLogLayout(next, bounds.width, bounds.height);
      setLayout(clamped);
      if (persist && storageKey) saveRollLogLayout(storageKey, clamped);
    },
    [measureContainer, storageKey],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const init = () => {
      const bounds = { width: el.clientWidth, height: el.clientHeight };
      if (bounds.width < 1 || bounds.height < 1) return;
      const stored = storageKey ? loadRollLogLayout(storageKey) : null;
      const base = stored ?? defaultRollLogLayout(bounds.width, bounds.height);
      setLayout(clampRollLogLayout(base, bounds.width, bounds.height));
    };

    init();
    const ro = new ResizeObserver(() => {
      const bounds = { width: el.clientWidth, height: el.clientHeight };
      if (bounds.width < 1 || bounds.height < 1) return;
      setLayout((prev) => {
        if (!prev) {
          const stored = storageKey ? loadRollLogLayout(storageKey) : null;
          const base = stored ?? defaultRollLogLayout(bounds.width, bounds.height);
          return clampRollLogLayout(base, bounds.width, bounds.height);
        }
        return clampRollLogLayout(prev, bounds.width, bounds.height);
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, storageKey]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rolls.length]);

  const persistLayout = () => {
    if (storageKey && layoutRef.current) {
      saveRollLogLayout(storageKey, layoutRef.current);
    }
  };

  const endDrag = () => {
    if (dragRef.current) persistLayout();
    dragRef.current = null;
  };

  const endResize = () => {
    if (resizeRef.current) persistLayout();
    resizeRef.current = null;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        applyLayout({
          ...layout!,
          left: dragRef.current.left + dx,
          top: dragRef.current.top + dy,
        });
      } else if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.x;
        const dy = e.clientY - resizeRef.current.y;
        const start = resizeRef.current.layout;
        applyLayout({
          ...start,
          width: start.width + dx,
          height: start.height + dy,
        });
      }
    };
    const onUp = () => {
      endDrag();
      endResize();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [applyLayout, layout]);

  if (!layout) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(18, 16, 14, 0.94)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        zIndex: 4,
        overflow: 'hidden',
        boxShadow: 4,
      }}
    >
      <Box
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          e.preventDefault();
          dragRef.current = {
            x: e.clientX,
            y: e.clientY,
            left: layout.left,
            top: layout.top,
          };
        }}
        sx={{
          px: 1,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="caption" fontWeight={800} color="primary.main" noWrap>
            Roll log
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <LegendDot kind="unspecified" />
          <LegendDot kind="attack" />
          <LegendDot kind="damage" />
          {onClear && (
            <Tooltip title="Clear log (this device)">
              <IconButton
                size="small"
                onClick={onClear}
                onPointerDown={(e) => e.stopPropagation()}
                sx={{ ml: 0.5 }}
              >
                <ClearAllIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <List
        ref={listRef}
        dense
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 0.5,
          px: 0.5,
          m: 0,
          minHeight: 0,
        }}
      >
        {rolls.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 1 }}>
            Rolls appear here in order.
          </Typography>
        ) : (
          rolls.map((entry) => {
            const color = rollKindTextColor(entry.rollKind);
            const line = formatRollLineDisplay(entry, {
              hideMonsterAc: hideMonsterAcInRollLog,
              isDm,
            });
            const clickable =
              isDm && entry.rollKind === 'damage' && onApplyDamage != null;
            const Row = clickable ? ListItemButton : ListItem;
            return (
              <Row
                key={entry.id}
                dense
                {...(clickable
                  ? {
                      onClick: () => onApplyDamage(entry),
                      sx: {
                        py: 0.35,
                        px: 1,
                        borderRadius: 0.5,
                        alignItems: 'flex-start',
                        '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.12)' },
                      },
                    }
                  : {
                      sx: { py: 0.35, px: 1, alignItems: 'flex-start' },
                    })}
              >
                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    <Chip
                      label={rollKindLabel(entry.rollKind)}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        color,
                        borderColor: color,
                        bgcolor: 'transparent',
                      }}
                      variant="outlined"
                    />
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color, fontWeight: 700, ml: 'auto' }}
                    >
                      {entry.total}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color,
                      display: 'block',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {line.prefix}
                    {line.outcome && (
                      <>
                        {' '}
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 800,
                            color: line.outcome.kind === 'hit' ? 'success.main' : color,
                          }}
                        >
                          {line.outcome.text}
                        </Box>
                      </>
                    )}{' '}
                    {line.suffix}
                  </Typography>
                  {clickable && (
                    <Typography variant="caption" color="error.light" sx={{ opacity: 0.8 }}>
                      Click to apply damage
                    </Typography>
                  )}
                </Box>
              </Row>
            );
          })
        )}
      </List>

      <Box
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          resizeRef.current = { x: e.clientX, y: e.clientY, layout };
        }}
        title="Resize"
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          touchAction: 'none',
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 3,
            bottom: 3,
            width: 8,
            height: 8,
            borderRight: '2px solid',
            borderBottom: '2px solid',
            borderColor: 'text.disabled',
            opacity: 0.7,
          },
        }}
      />
    </Box>
  );
}

function LegendDot({ kind }: { kind: DiceRollKind }) {
  return (
    <Box
      title={rollKindLabel(kind)}
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: rollKindTextColor(kind),
      }}
    />
  );
}
