import { useCallback, useRef } from 'react';
import type { GameInitiativeState, GamePatch } from '@dcc-web/shared';
import { useGameSocket } from '../useGameSocket';
import type { Character, GameDetail, GamePresenceUser } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import { parseRollLogEntry } from '../../utils/roll-log';
import { parseMapTokenPatch } from '../../utils/map-token-patch';
import type { MapTokenPatch } from '../../utils/map-token-patch';

const ROOM_RESYNC_COOLDOWN_MS = 3000;

type SyncCallbacks = {
  loadDetail: () => Promise<unknown>;
  loadDiceRolls: () => Promise<unknown>;
  loadCharacters: () => Promise<unknown>;
  loadMonsters: () => Promise<unknown>;
  loadMaps: () => Promise<unknown>;
  applyMapTokenFromServer: (patch: MapTokenPatch) => void;
  applyGamePatch: (patch: GamePatch) => void;
  resyncAll: () => void;
  applyInitiative: (next: GameInitiativeState | null) => void;
  applyGameSettingsPatch: (patch: {
    monstersVisibleOnMap?: boolean;
    sharedMonsterInitiative?: boolean;
    hideMonsterAcInRollLog?: boolean;
    activeMapId?: string | null;
  }) => void;
  appendRollLog: (entry: DiceRollLogEntry) => void;
  setCombatRollByCharacter: React.Dispatch<
    React.SetStateAction<Record<string, DiceRollLogEntry>>
  >;
  setPresenceUsers: (users: GamePresenceUser[]) => void;
  onCharacterUpsert?: (character: Character, actorUserId?: string) => void;
};

export function useGameRealtimeSync(
  gameId: string | undefined,
  enabled: boolean,
  userId: string | undefined,
  detailRef: React.RefObject<GameDetail | null>,
  lastGameFetchRef: React.RefObject<number>,
  callbacks: SyncCallbacks,
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const onConnected = useCallback(() => {
    const lastFetch = lastGameFetchRef.current ?? 0;
    if (Date.now() - lastFetch < ROOM_RESYNC_COOLDOWN_MS) return;
    lastGameFetchRef.current = Date.now();
    callbacksRef.current.resyncAll();
  }, [lastGameFetchRef]);

  useGameSocket(
    gameId,
    {
      onConnected,
      onGamePatch: ({ patch, actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        try {
          callbacksRef.current.applyGamePatch(patch);
        } catch (err) {
          console.error('[game:patch] apply failed, resyncing', err);
          callbacksRef.current.resyncAll();
        }
      },
      onCharacterUpsert: (character, actorUserId) => {
        if (actorUserId && actorUserId === userId) return;
        if (callbacksRef.current.onCharacterUpsert) {
          callbacksRef.current.onCharacterUpsert(character, actorUserId);
          return;
        }
        void callbacksRef.current.loadCharacters().catch(() => {});
      },
      onInitiativeUpdated: (next) => {
        callbacksRef.current.applyInitiative(next);
      },
      onSettingsUpdated: (settings) => {
        if (settings && typeof settings === 'object') {
          callbacksRef.current.applyGameSettingsPatch(
            settings as Parameters<SyncCallbacks['applyGameSettingsPatch']>[0],
          );
        }
      },
      onDiceRolled: ({ result, characterId }) => {
        const entry = parseRollLogEntry(result);
        if (entry) callbacksRef.current.appendRollLog(entry);
        if (characterId && entry) {
          callbacksRef.current.setCombatRollByCharacter((prev) => ({
            ...prev,
            [characterId]: entry,
          }));
        }
      },
      onDamageApplied: ({ actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
      },
      onTokenUpdated: ({ token, actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        const tokenPatch = parseMapTokenPatch(token);
        if (!tokenPatch) {
          callbacksRef.current.resyncAll();
          return;
        }
        callbacksRef.current.applyMapTokenFromServer(tokenPatch);
      },
      onTokenMoved: ({ token, actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        const tokenPatch = parseMapTokenPatch(token);
        if (!tokenPatch) {
          callbacksRef.current.resyncAll();
          return;
        }
        callbacksRef.current.applyMapTokenFromServer(tokenPatch);
      },
      onPresenceUpdated: (users) => {
        callbacksRef.current.setPresenceUsers(users);
        const d = detailRef.current;
        if (!d) return;
        const rosterIds = new Set<string>([
          d.game.dmUserId,
          ...(d.game.players?.map((p) => p.user.id) ?? []),
        ]);
        if (users.some((u) => !rosterIds.has(u.userId))) {
          void callbacksRef.current.loadDetail().catch(() => {});
        }
      },
      onRosterChanged: (actorUserId) => {
        if (actorUserId && actorUserId === userId) return;
        void callbacksRef.current.loadDetail().catch(() => {});
      },
    },
    enabled,
  );
}
