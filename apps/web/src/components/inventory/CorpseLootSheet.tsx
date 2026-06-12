import { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { GameMonsterInstance } from '@dcc-web/shared';
import type { Character } from '../../types/game';
import {
  TransferItemDialog,
  type TransferableItem,
  type TransferInventoryResult,
} from './TransferItemDialog';

export type CorpseLootTarget =
  | { kind: 'character'; character: Character }
  | { kind: 'monster'; monster: GameMonsterInstance };

interface CorpseLootSheetProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  target: CorpseLootTarget | null;
  characters: Character[];
  monsters: GameMonsterInstance[];
  currentUserId?: string;
  isDm?: boolean;
  onTransferred: (result: TransferInventoryResult) => void;
}

export function CorpseLootSheet({
  open,
  onClose,
  gameId,
  target,
  characters,
  monsters,
  currentUserId,
  isDm,
  onTransferred,
}: CorpseLootSheetProps) {
  const [transferItem, setTransferItem] = useState<TransferableItem | null>(null);

  const sourceType = target?.kind === 'monster' ? 'monster' : 'character';
  const sourceId =
    target?.kind === 'monster' ? target.monster.id : (target?.character.id ?? '');
  const sourceLabel =
    target?.kind === 'monster' ? target.monster.name : (target?.character.name ?? 'Corpse');
  const items =
    target?.kind === 'monster'
      ? (target.monster.items ?? [])
      : (target?.character.items ?? []);

  const playerLootMode = !isDm;

  const handleTransferred = (result: TransferInventoryResult) => {
    onTransferred(result);
    setTransferItem(null);
  };

  const subtitle = useMemo(() => {
    if (target?.kind === 'character') return 'Slain character — take items after combat';
    if (target?.kind === 'monster') return 'Slain creature — take loot after combat';
    return '';
  }, [target]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          {sourceLabel}
          <Typography variant="caption" color="text.secondary" display="block">
            {subtitle}
          </Typography>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nothing to loot.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {items.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    py: 0.5,
                    px: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2">
                      {item.name} ×{item.quantity}
                    </Typography>
                    {item.notes ? (
                      <Typography variant="caption" color="text.secondary">
                        {item.notes}
                      </Typography>
                    ) : null}
                  </Box>
                  <Tooltip title="Take item">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setTransferItem({
                          id: item.id,
                          name: item.name,
                          category: item.category,
                          quantity: item.quantity,
                          notes: item.notes,
                          properties: item.properties,
                        })
                      }
                    >
                      <SwapHorizIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {transferItem && target && (
        <TransferItemDialog
          open
          onClose={() => setTransferItem(null)}
          gameId={gameId}
          sourceType={sourceType}
          sourceId={sourceId}
          sourceLabel={sourceLabel}
          item={transferItem}
          characters={characters}
          monsters={monsters}
          playerLootMode={playerLootMode}
          currentUserId={currentUserId}
          onTransferred={handleTransferred}
        />
      )}
    </>
  );
}
