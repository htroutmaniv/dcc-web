import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import type { CreateCharacterPayload } from '../CreateCharacterDialog';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import type { Character, GameMonsterInstance } from '../../types/game';
import type { MapTokenTarget } from '../ApplyDamageDialog';
import type { CorpseLootTarget } from '../inventory/CorpseLootSheet';

const CreateCharacterDialog = lazy(() =>
  import('../CreateCharacterDialog').then((m) => ({ default: m.CreateCharacterDialog })),
);
const ApplyDamageDialog = lazy(() =>
  import('../ApplyDamageDialog').then((m) => ({ default: m.ApplyDamageDialog })),
);
const ConsumeResourceDialog = lazy(() =>
  import('../ConsumeResourceDialog').then((m) => ({ default: m.ConsumeResourceDialog })),
);
const CorpseLootSheet = lazy(() =>
  import('../inventory/CorpseLootSheet').then((m) => ({ default: m.CorpseLootSheet })),
);

function DialogSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'none' }}>
          <CircularProgress size={24} />
        </Box>
      }
    >
      {children}
    </Suspense>
  );
}

export type GameDialogsProps = {
  gameId: string;
  isDm: boolean;
  dmUserId: string;
  players: { id: string; displayName: string }[];
  characters: Character[];
  monsters: GameMonsterInstance[];
  npcTokens: MapTokenTarget[];
  currentUserId?: string;
  createDialogOpen: boolean;
  creatingCharacter: boolean;
  onCloseCreateDialog: () => void;
  onCreateCharacter: (payload: CreateCharacterPayload) => void | Promise<void>;
  applyDamageRoll: DiceRollLogEntry | null;
  applyingDamage: boolean;
  onCloseApplyDamage: () => void;
  onApplyDamage: (
    targetType: 'character' | 'monster' | 'npc',
    targetId: string,
    amount: number,
  ) => void | Promise<void>;
  consumeDialog: { character: Character; kind: 'food' | 'drink' } | null;
  consumableAdjustingId: string | null;
  onCloseConsumeDialog: () => void;
  onConsumeItem: (itemId: string) => void;
  corpseLootOpen: boolean;
  corpseLootTarget: CorpseLootTarget | null;
  onCloseCorpseLoot: () => void;
  onInventoryTransferred: (result: import('../inventory/TransferItemDialog').TransferInventoryResult) => void;
};

export function GameDialogs({
  gameId,
  isDm,
  dmUserId,
  players,
  characters,
  monsters,
  npcTokens,
  currentUserId,
  createDialogOpen,
  creatingCharacter,
  onCloseCreateDialog,
  onCreateCharacter,
  applyDamageRoll,
  applyingDamage,
  onCloseApplyDamage,
  onApplyDamage,
  consumeDialog,
  consumableAdjustingId,
  onCloseConsumeDialog,
  onConsumeItem,
  corpseLootOpen,
  corpseLootTarget,
  onCloseCorpseLoot,
  onInventoryTransferred,
}: GameDialogsProps) {
  return (
    <>
      <DialogSuspense>
        <CorpseLootSheet
          open={corpseLootOpen && corpseLootTarget != null}
          onClose={onCloseCorpseLoot}
          gameId={gameId}
          target={corpseLootTarget}
          characters={characters}
          monsters={monsters}
          currentUserId={currentUserId}
          isDm={isDm}
          onTransferred={onInventoryTransferred}
        />
      </DialogSuspense>
      <DialogSuspense>
        <CreateCharacterDialog
          open={createDialogOpen}
          onClose={onCloseCreateDialog}
          onSubmit={async (payload) => {
            await onCreateCharacter(payload);
          }}
          submitting={creatingCharacter}
          isDm={isDm}
          players={players}
          dmUserId={dmUserId}
        />
      </DialogSuspense>
      <DialogSuspense>
        <ApplyDamageDialog
          open={applyDamageRoll != null}
          roll={applyDamageRoll}
          characters={characters}
          monsters={monsters}
          npcTokens={npcTokens}
          onClose={onCloseApplyDamage}
          onApply={async (targetType, targetId, amount) => {
            await onApplyDamage(targetType, targetId, amount);
          }}
          applying={applyingDamage}
        />
      </DialogSuspense>
      <DialogSuspense>
        <ConsumeResourceDialog
          open={consumeDialog != null}
          character={consumeDialog?.character ?? null}
          kind={consumeDialog?.kind ?? null}
          busy={consumableAdjustingId != null}
          onClose={onCloseConsumeDialog}
          onConsume={(itemId) => void onConsumeItem(itemId)}
        />
      </DialogSuspense>
    </>
  );
}
