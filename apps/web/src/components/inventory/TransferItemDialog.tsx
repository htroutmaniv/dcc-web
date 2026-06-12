import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { isMonsterKilled, type GameMonsterInstance } from '@dcc-web/shared';
import { api } from '../../api/client';
import type { Character } from '../../types/game';
import { formatError } from '../../utils/errors';

export type InventoryOwnerType = 'character' | 'monster';

export type TransferableItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
};

export type TransferInventoryResult = {
  sourceCharacter?: Character;
  targetCharacter?: Character;
  sourceMonster?: GameMonsterInstance;
  targetMonster?: GameMonsterInstance;
};

interface TransferItemDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  sourceType: InventoryOwnerType;
  sourceId: string;
  sourceLabel: string;
  item: TransferableItem;
  characters: Character[];
  monsters: GameMonsterInstance[];
  /** When true, only the current user's living PCs can receive items. */
  playerLootMode?: boolean;
  currentUserId?: string;
  onTransferred: (result: TransferInventoryResult) => void;
}

export function TransferItemDialog({
  open,
  onClose,
  gameId,
  sourceType,
  sourceId,
  sourceLabel,
  item,
  characters,
  monsters,
  playerLootMode = false,
  currentUserId,
  onTransferred,
}: TransferItemDialogProps) {
  const [tab, setTab] = useState(0);
  const [quantity, setQuantity] = useState(item.quantity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetCharacters = useMemo(() => {
    let list = characters.filter(
      (c) => !(sourceType === 'character' && c.id === sourceId),
    );
    if (playerLootMode) {
      list = list.filter(
        (c) => c.ownerUserId === currentUserId && c.status === 'alive',
      );
    }
    return list;
  }, [characters, sourceType, sourceId, playerLootMode, currentUserId]);

  const targetMonsters = useMemo(
    () =>
      playerLootMode
        ? []
        : monsters.filter((m) => !(sourceType === 'monster' && m.id === sourceId)),
    [monsters, sourceType, sourceId, playerLootMode],
  );

  const transfer = async (targetType: InventoryOwnerType, targetId: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<TransferInventoryResult>(
        `/games/${gameId}/transfer-item`,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceType,
            sourceId,
            sourceItemId: item.id,
            targetType,
            targetId,
            quantity: quantity < item.quantity ? quantity : undefined,
          }),
        },
      );
      onTransferred(result);
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const labelForMonster = (m: GameMonsterInstance) =>
    isMonsterKilled(m) ? `${m.name} (slain)` : m.name;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Transfer item</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          From {sourceLabel}: <strong>{item.name}</strong> (×{item.quantity})
        </Typography>
        {item.quantity > 1 && (
          <TextField
            label="Quantity"
            type="number"
            size="small"
            fullWidth
            value={quantity}
            onChange={(e) => {
              const n = Math.max(1, Math.min(item.quantity, Number(e.target.value) || 1));
              setQuantity(n);
            }}
            inputProps={{ min: 1, max: item.quantity }}
            sx={{ mb: 2 }}
          />
        )}
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ mb: 1, display: playerLootMode ? 'none' : undefined }}
        >
          <Tab label={`PCs (${targetCharacters.length})`} />
          <Tab label={`Monsters (${targetMonsters.length})`} />
        </Tabs>
        {(playerLootMode || tab === 0) && (
          <List dense disablePadding>
            {targetCharacters.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {playerLootMode
                  ? 'You need a living character to take this loot.'
                  : 'No other characters in this game.'}
              </Typography>
            ) : (
              targetCharacters.map((c) => (
                <ListItemButton
                  key={c.id}
                  disabled={busy}
                  onClick={() => void transfer('character', c.id)}
                >
                  <ListItemText primary={c.name} secondary={c.className || 'Character'} />
                </ListItemButton>
              ))
            )}
          </List>
        )}
        {!playerLootMode && tab === 1 && (
          <List dense disablePadding>
            {targetMonsters.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No other monsters in play.
              </Typography>
            ) : (
              targetMonsters.map((m) => (
                <ListItemButton
                  key={m.id}
                  disabled={busy}
                  onClick={() => void transfer('monster', m.id)}
                >
                  <ListItemText
                    primary={labelForMonster(m)}
                    secondary={`${m.items?.length ?? 0} item(s) in loot`}
                  />
                </ListItemButton>
              ))
            )}
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
