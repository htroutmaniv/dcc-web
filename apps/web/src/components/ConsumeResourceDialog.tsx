import { useMemo } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { listConsumableChoices } from '@dcc-web/shared';
import type { Character } from '../types/game';

interface ConsumeResourceDialogProps {
  open: boolean;
  character: Character | null;
  kind: 'food' | 'drink' | null;
  busy?: boolean;
  onClose: () => void;
  onConsume: (itemId: string) => void;
}

const TITLES: Record<'food' | 'drink', string> = {
  food: 'Eat',
  drink: 'Drink',
};

export function ConsumeResourceDialog({
  open,
  character,
  kind,
  busy,
  onClose,
  onConsume,
}: ConsumeResourceDialogProps) {
  const items = character?.items ?? [];

  const choices = useMemo(() => {
    if (!kind) return [];
    return listConsumableChoices(items, kind);
  }, [items, kind]);

  if (!character || !kind) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {TITLES[kind]} — {character.name}
      </DialogTitle>
      <DialogContent dividers>
        {kind === 'drink' && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Drinks are stored in vessels (waterskins, etc.). Pick which one to drink from.
          </Alert>
        )}
        {choices.length === 0 ? (
          <Alert severity="info">
            Nothing to {kind === 'food' ? 'eat' : 'drink'}. Add gear via Manage equipment.
          </Alert>
        ) : (
          <List dense disablePadding>
            {choices.map(({ item, summary }) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton disabled={busy} onClick={() => onConsume(item.id!)}>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      kind === 'food'
                        ? `Consume 1 day — ${summary}`
                        : `Consume 1 — ${summary}`
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
