import { useCallback, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import { GamePresencePanel } from './GamePresencePanel';
import { CharacterListItem, type CombatTargetOption } from './CharacterListItem';
import { DmCharacterSections } from './DmCharacterSections';
import type { DiceResult } from '../types/game';
import { DiceTabPanel } from './DiceTabPanel';
import type { Character, Game, GamePresenceUser, User } from '../types/game';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import {
  isCharacterTurn,
  type DiceTrayCounts,
  type GameInitiativeState,
} from '@dcc-web/shared';
import type { CharacterRollKind, CombatRollKind } from '../utils/character-rolls';

export type GameMenuTab = 'characters' | 'dice' | 'presence';

interface GameSideMenuProps {
  game: Game;
  isDm: boolean;
  inviteCode: string;
  characters: Character[];
  players?: { user: User }[];
  tab: GameMenuTab;
  onTabChange: (tab: GameMenuTab) => void;
  lastRoll: DiceRollLogEntry | null;
  diceTrayCounts: DiceTrayCounts;
  onDiceTrayCountsChange: (counts: DiceTrayCounts) => void;
  onResetDiceTray: () => void;
  diceRolling?: boolean;
  onAddCharacter: () => void;
  onRollDiceTray: () => void;
  diceCharacterId: string | null;
  onDiceCharacterIdChange: (id: string | null) => void;
  onCharacterQuickRoll: (kind: CharacterRollKind) => void;
  diceQuickRollKind?: CharacterRollKind | null;
  onSelectCharacter: (character: Character) => void;
  onCombatRoll: (character: Character, kind: CombatRollKind) => void;
  onPatchCharacterHp?: (character: Character, hpCurrent: number) => void;
  hpAdjustingId?: string | null;
  onSelectWeapon?: (character: Character, weaponId: string) => void;
  combatTargetOptions?: CombatTargetOption[];
  characterAttackTargetById?: Record<string, string>;
  onCharacterAttackTargetChange?: (characterId: string, targetRef: string | null) => void;
  onOpenConsume: (character: Character, kind: 'food' | 'drink') => void;
  onSelectActiveLight: (character: Character, lightItemId: string | null) => void;
  onToggleLightLit: (character: Character, lit: boolean) => void;
  onExpendActiveLight: (character: Character) => void;
  consumableAdjustingId?: string | null;
  canEditCharacter: (character: Character) => boolean;
  rollingCharacterId?: string | null;
  rollingKind?: CombatRollKind | null;
  combatRollByCharacter?: Record<string, DiceResult>;
  selectedCharacterId?: string | null;
  initiative?: GameInitiativeState | null;
  onToggleInPlay: (character: Character, active: boolean) => void;
  onEndTurn: (character: Character) => void;
  endTurnCharacterId?: string | null;
  currentUserId?: string;
  presenceUsers?: GamePresenceUser[];
}

export function GameSideMenu({
  game,
  isDm,
  inviteCode,
  characters,
  players,
  tab,
  onTabChange,
  lastRoll,
  diceTrayCounts,
  onDiceTrayCountsChange,
  onResetDiceTray,
  diceRolling,
  onAddCharacter,
  onRollDiceTray,
  diceCharacterId,
  onDiceCharacterIdChange,
  onCharacterQuickRoll,
  diceQuickRollKind,
  onSelectCharacter,
  onCombatRoll,
  onPatchCharacterHp,
  hpAdjustingId,
  onSelectWeapon,
  combatTargetOptions = [],
  characterAttackTargetById = {},
  onCharacterAttackTargetChange,
  onOpenConsume,
  onSelectActiveLight,
  onToggleLightLit,
  onExpendActiveLight,
  consumableAdjustingId,
  canEditCharacter,
  rollingCharacterId,
  rollingKind,
  combatRollByCharacter,
  selectedCharacterId,
  initiative,
  onToggleInPlay,
  onEndTurn,
  endTurnCharacterId,
  currentUserId,
  presenceUsers = [],
}: GameSideMenuProps) {
  const [copied, setCopied] = useState(false);
  const initiativeActive = initiative?.active ?? false;

  const copyInviteCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable outside secure context.
    }
  }, [inviteCode]);
  return (
    <Box
      sx={{
        width: { xs: 320, sm: 420 },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Session menu
        </Typography>
        <Typography variant="body2" noWrap title={game.title}>
          {game.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            Code: {inviteCode}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy invite code'}>
            <IconButton
              size="small"
              onClick={() => void copyInviteCode()}
              aria-label="Copy invite code"
              sx={{ p: 0.25 }}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v as GameMenuTab)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<GroupsIcon />} iconPosition="start" label="PCs" value="characters" />
        <Tab icon={<CasinoIcon />} iconPosition="start" label="Dice" value="dice" />
        <Tab icon={<PeopleIcon />} iconPosition="start" label="In game" value="presence" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 'characters' && (
          <>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onAddCharacter}
              sx={{ mb: 2 }}
            >
              Add character
            </Button>
            {isDm && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Kill, revive, and archive from the character sheet.
              </Typography>
            )}
            {characters.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No characters in this game yet.
              </Typography>
            ) : isDm && game.dmUserId ? (
              <DmCharacterSections
                characters={characters}
                players={players ?? []}
                dmUserId={game.dmUserId}
                presenceUsers={presenceUsers}
                renderItem={(c) => {
                  const isTurn = isCharacterTurn(initiative ?? null, c.id);
                  const canEndTurn =
                    initiativeActive &&
                    isTurn &&
                    (isDm || (currentUserId != null && c.ownerUserId === currentUserId));
                  return (
                    <CharacterListItem
                      key={c.id}
                      character={c}
                      selected={selectedCharacterId === c.id}
                      onSelect={() => onSelectCharacter(c)}
                      onCombatRoll={(kind) => onCombatRoll(c, kind)}
                      onPatchHp={
                        onPatchCharacterHp
                          ? (hp) => onPatchCharacterHp(c, hp)
                          : undefined
                      }
                      canEditHp={canEditCharacter(c)}
                      hpAdjusting={hpAdjustingId === c.id}
                      onSelectWeapon={(weaponId) => onSelectWeapon?.(c, weaponId)}
                      combatTargets={combatTargetOptions}
                      attackTargetId={characterAttackTargetById[c.id] ?? ''}
                      onAttackTargetChange={(ref) =>
                        onCharacterAttackTargetChange?.(c.id, ref)
                      }
                      onOpenConsume={(kind) => onOpenConsume(c, kind)}
                      onSelectActiveLight={(lightItemId) =>
                        onSelectActiveLight(c, lightItemId)
                      }
                      onToggleLightLit={(lit) => onToggleLightLit(c, lit)}
                      onExpendActiveLight={() => onExpendActiveLight(c)}
                      consumableAdjusting={consumableAdjustingId === c.id}
                      canEditConsumables={canEditCharacter(c)}
                      canToggleInPlay={canEditCharacter(c)}
                      onToggleInPlay={(active) => onToggleInPlay(c, active)}
                      initiativeActive={initiativeActive}
                      isInitiativeTurn={isTurn}
                      canEndTurn={canEndTurn}
                      onEndTurn={() => onEndTurn(c)}
                      endingTurn={endTurnCharacterId === c.id}
                      rollingKind={
                        rollingCharacterId === c.id ? (rollingKind ?? null) : null
                      }
                      lastRoll={combatRollByCharacter?.[c.id]}
                    />
                  );
                }}
              />
            ) : (
              <List disablePadding>
                {characters.map((c) => {
                  const isTurn = isCharacterTurn(initiative ?? null, c.id);
                  const canEndTurn =
                    initiativeActive &&
                    isTurn &&
                    (isDm || (currentUserId != null && c.ownerUserId === currentUserId));
                  return (
                    <CharacterListItem
                      key={c.id}
                      character={c}
                      selected={selectedCharacterId === c.id}
                      onSelect={() => onSelectCharacter(c)}
                      onCombatRoll={(kind) => onCombatRoll(c, kind)}
                      onPatchHp={
                        onPatchCharacterHp
                          ? (hp) => onPatchCharacterHp(c, hp)
                          : undefined
                      }
                      canEditHp={canEditCharacter(c)}
                      hpAdjusting={hpAdjustingId === c.id}
                      onSelectWeapon={(weaponId) => onSelectWeapon?.(c, weaponId)}
                      combatTargets={combatTargetOptions}
                      attackTargetId={characterAttackTargetById[c.id] ?? ''}
                      onAttackTargetChange={(ref) =>
                        onCharacterAttackTargetChange?.(c.id, ref)
                      }
                      onOpenConsume={(kind) => onOpenConsume(c, kind)}
                      onSelectActiveLight={(lightItemId) =>
                        onSelectActiveLight(c, lightItemId)
                      }
                      onToggleLightLit={(lit) => onToggleLightLit(c, lit)}
                      onExpendActiveLight={() => onExpendActiveLight(c)}
                      consumableAdjusting={consumableAdjustingId === c.id}
                      canEditConsumables={canEditCharacter(c)}
                      canToggleInPlay={canEditCharacter(c)}
                      onToggleInPlay={(active) => onToggleInPlay(c, active)}
                      initiativeActive={initiativeActive}
                      isInitiativeTurn={isTurn}
                      canEndTurn={canEndTurn}
                      onEndTurn={() => onEndTurn(c)}
                      endingTurn={endTurnCharacterId === c.id}
                      rollingKind={
                        rollingCharacterId === c.id ? (rollingKind ?? null) : null
                      }
                      lastRoll={combatRollByCharacter?.[c.id]}
                    />
                  );
                })}
              </List>
            )}
          </>
        )}

        {tab === 'dice' && (
          <DiceTabPanel
            characters={characters}
            diceCharacterId={diceCharacterId}
            onDiceCharacterIdChange={onDiceCharacterIdChange}
            counts={diceTrayCounts}
            onCountsChange={onDiceTrayCountsChange}
            onRollTray={onRollDiceTray}
            onResetTray={onResetDiceTray}
            onQuickRoll={onCharacterQuickRoll}
            lastRoll={lastRoll}
            rolling={diceRolling}
            quickRollKind={diceQuickRollKind}
          />
        )}

        {tab === 'presence' && (
          <GamePresencePanel
            dmUserId={game.dmUserId}
            dmDisplayName={game.dm?.displayName ?? 'Dungeon Master'}
            players={players}
            presenceUsers={presenceUsers}
            currentUserId={currentUserId}
          />
        )}
      </Box>
    </Box>
  );
}
