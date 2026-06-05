import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import MapIcon from '@mui/icons-material/Map';
import { CharacterListItem } from './CharacterListItem';
import { DiceTabPanel } from './DiceTabPanel';
import type { Character, DiceResult, Game, User } from '../types/game';
import {
  isCharacterTurn,
  type DiceTrayCounts,
  type GameInitiativeState,
} from '@dcc-web/shared';
import type { CharacterRollKind, CombatRollKind } from '../utils/character-rolls';

export type GameMenuTab = 'characters' | 'dice' | 'session';

interface GameSideMenuProps {
  game: Game;
  isDm: boolean;
  inviteCode: string;
  characters: Character[];
  players?: { user: User }[];
  tab: GameMenuTab;
  onTabChange: (tab: GameMenuTab) => void;
  lastRoll: DiceResult | null;
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
}: GameSideMenuProps) {
  const initiativeActive = initiative?.active ?? false;
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
        <Typography variant="caption" color="text.secondary">
          Code: {inviteCode}
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v as GameMenuTab)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<GroupsIcon />} iconPosition="start" label="PCs" value="characters" />
        <Tab icon={<CasinoIcon />} iconPosition="start" label="Dice" value="dice" />
        <Tab icon={<MapIcon />} iconPosition="start" label="Info" value="session" />
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

        {tab === 'session' && (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              Role: <strong>{isDm ? 'Dungeon Master' : 'Player'}</strong>
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Players in game
            </Typography>
            {players?.length ? (
              <List dense>
                {players.map((p) => (
                  <ListItem key={p.user.id} disablePadding>
                    <ListItemText primary={p.user.displayName} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No players listed yet.
              </Typography>
            )}
            {isDm && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  DM map tools (reset tokens, clear map) will appear here.
                </Typography>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
