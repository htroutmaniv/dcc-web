import { useCallback, useRef } from 'react';
import type { GameInitiativeState } from '@dcc-web/shared';
import { useGameSocket } from '../useGameSocket';
import type { Character, GameDetail, GamePresenceUser } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import { parseRollLogEntry } from '../../utils/roll-log';
import { parseMapTokenPatch } from '../../utils/map-token-patch';
import type { MapTokenPatch } from '../../utils/map-token-patch';

const ROOM_RESYNC_COOLDOWN_MS = 3000;
const MAP_RELOAD_DEBOUNCE_MS = 250;

type SyncCallbacks = {
  loadDetail: () => Promise<unknown>;
  loadDiceRolls: () => Promise<unknown>;
  loadCharacters: () => Promise<unknown>;
  loadMonsters: () => Promise<unknown>;
  loadMaps: () => Promise<unknown>;
  applyMapTokenFromServer: (patch: MapTokenPatch) => void;
  applyInitiative: (next: GameInitiativeState | null) => void;
  applyGameSettingsPatch: (patch: {
    monstersVisibleOnMap?: boolean;
    sharedMonsterInitiative?: boolean;
    hideMonsterAcInRollLog?: boolean;
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
  const mapReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleLoadMaps = useCallback(() => {
    if (mapReloadTimerRef.current) clearTimeout(mapReloadTimerRef.current);
    mapReloadTimerRef.current = setTimeout(() => {
      void callbacksRef.current.loadMaps().catch(() => {});
    }, MAP_RELOAD_DEBOUNCE_MS);
  }, []);

  const onConnected = useCallback(() => {
    const lastFetch = lastGameFetchRef.current ?? 0;
    if (Date.now() - lastFetch < ROOM_RESYNC_COOLDOWN_MS) return;
    lastGameFetchRef.current = Date.now();
    void callbacksRef.current.loadDetail().catch(() => {});
    void callbacksRef.current.loadDiceRolls().catch(() => {});
  }, [lastGameFetchRef]);

  useGameSocket(
    gameId,
    {
      onConnected,
      onMonstersChanged: ({ actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        void callbacksRef.current.loadMonsters().catch(() => {});
      },
      onCharacterUpsert: (character, actorUserId) => {
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
          const parsed = settings as {
            monstersVisibleOnMap?: boolean;
            sharedMonsterInitiative?: boolean;
            hideMonsterAcInRollLog?: boolean;
          };
          if (typeof parsed.monstersVisibleOnMap === 'boolean') {
            callbacksRef.current.applyGameSettingsPatch({
              monstersVisibleOnMap: parsed.monstersVisibleOnMap,
            });
          }
          if (typeof parsed.sharedMonsterInitiative === 'boolean') {
            callbacksRef.current.applyGameSettingsPatch({
              sharedMonsterInitiative: parsed.sharedMonsterInitiative,
            });
          }
          if (typeof parsed.hideMonsterAcInRollLog === 'boolean') {
            callbacksRef.current.applyGameSettingsPatch({
              hideMonsterAcInRollLog: parsed.hideMonsterAcInRollLog,
            });
          }
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
        void callbacksRef.current.loadCharacters().catch(() => {});
        void callbacksRef.current.loadMonsters().catch(() => {});
        scheduleLoadMaps();
      },
      onTokenMoved: ({ token, actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        const patch = parseMapTokenPatch(token);
        if (patch) {
          callbacksRef.current.applyMapTokenFromServer(patch);
          return;
        }
        scheduleLoadMaps();
      },
      onTokenUpdated: ({ token, actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        const patch = parseMapTokenPatch(token);
        if (patch) {
          callbacksRef.current.applyMapTokenFromServer(patch);
          return;
        }
        scheduleLoadMaps();
      },
      onMapUpdated: (actorUserId) => {
        if (actorUserId && actorUserId === userId) return;
        scheduleLoadMaps();
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
