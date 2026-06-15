import { useCallback, useRef } from 'react';
import type { GameInitiativeState } from '@dcc-web/shared';
import { useGameSocket } from '../useGameSocket';
import type { Character, GameDetail, GamePresenceUser } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import { parseRollLogEntry } from '../../utils/roll-log';

type SyncCallbacks = {
  loadDetail: () => Promise<unknown>;
  loadDiceRolls: () => Promise<unknown>;
  loadCharacters: () => Promise<unknown>;
  loadMonsters: () => Promise<unknown>;
  loadMaps: () => Promise<unknown>;
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
  callbacks: SyncCallbacks,
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const onConnected = useCallback(() => {
    void callbacksRef.current.loadDetail().catch(() => {});
    void callbacksRef.current.loadDiceRolls().catch(() => {});
  }, []);

  useGameSocket(
    gameId,
    {
      onConnected,
      onMonstersChanged: ({ actorUserId }) => {
        if (actorUserId && actorUserId === userId) return;
        void callbacksRef.current.loadMonsters().catch(() => {});
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
      onDamageApplied: () => {
        void callbacksRef.current.loadCharacters().catch(() => {});
        void callbacksRef.current.loadMonsters().catch(() => {});
        void callbacksRef.current.loadDetail().catch(() => {});
      },
      onTokenUpdated: () => {
        void callbacksRef.current.loadMaps().catch(() => {});
      },
      onMapUpdated: () => {
        void callbacksRef.current.loadMaps().catch(() => {});
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
