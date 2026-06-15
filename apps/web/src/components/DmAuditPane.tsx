import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { api } from '../api/client';

export interface AuditLogEntry {
  id: string;
  kind: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; displayName: string } | null;
}

function formatAuditKind(kind: string): string {
  return kind.replace(/\./g, ' · ').replace(/_/g, ' ');
}

function summarizePayload(entry: AuditLogEntry): string {
  const p = entry.payload;
  switch (entry.kind) {
    case 'character.status_change':
      return `${String(p.name ?? 'Character')}: ${String(p.from)} → ${String(p.to)}`;
    case 'character.owner_change':
      return `${String(p.name ?? 'Character')}: owner changed`;
    case 'monster.killed':
      return String(p.name ?? 'Monster');
    case 'monster.in_play_toggle':
      return `${String(p.name ?? 'Monster')}: ${p.from ? 'in play' : 'out'} → ${p.to ? 'in play' : 'out'}`;
    case 'inventory.transfer':
      return `${String(p.sourceType)} → ${String(p.targetType)} (qty ${String(p.quantity ?? 1)})`;
    case 'game.settings_change':
      return `Changed: ${Object.keys((p.changes as object) ?? {}).join(', ') || 'settings'}`;
    case 'map.clear':
      return p.clearImage ? 'Cleared drawings + image' : 'Cleared drawings';
    case 'map.tokens_reset':
      return `Reset ${String(p.tokenCount ?? 0)} tokens to holding`;
    default:
      return JSON.stringify(p);
  }
}

export function DmAuditPane({ gameId }: { gameId: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ entries: AuditLogEntry[] }>(
          `/games/${gameId}/audit?limit=100`,
        );
        if (!cancelled) setEntries(res.entries);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load audit log');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No audit entries yet. DM actions such as status changes, transfers, and map clears are logged here.
        </Typography>
      </Box>
    );
  }

  return (
    <List dense sx={{ overflow: 'auto', flex: 1, py: 0 }}>
      {entries.map((entry) => (
        <ListItem key={entry.id} alignItems="flex-start" sx={{ px: 2 }}>
          <ListItemText
            primary={formatAuditKind(entry.kind)}
            secondary={
              <>
                {summarizePayload(entry)}
                {' · '}
                {entry.actor?.displayName ?? 'System'}
                {' · '}
                {new Date(entry.createdAt).toLocaleString()}
              </>
            }
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption', component: 'span' }}
          />
        </ListItem>
      ))}
    </List>
  );
}
