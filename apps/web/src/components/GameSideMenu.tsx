import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import MapIcon from '@mui/icons-material/Map';
import { CharacterListItem } from './CharacterListItem';
import type { Character, DiceResult, Game, User } from '../types/game';
import type { ConsumableTrackKind } from '@dcc-web/shared';
import type { CombatRollKind } from '../utils/combat-rolls';

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
  onAddCharacter: () => void;
  onRollD20: () => void;
  onSelectCharacter: (character: Character) => void;
  onCombatRoll: (character: Character, kind: CombatRollKind) => void;
  onAdjustConsumable: (character: Character, kind: ConsumableTrackKind, delta: number) => void;
  onToggleLightSource: (character: Character, using: boolean) => void;
  consumableAdjustingId?: string | null;
  canEditCharacter: (character: Character) => boolean;
  rollingCharacterId?: string | null;
  rollingKind?: CombatRollKind | null;
  combatRollByCharacter?: Record<string, DiceResult>;
  selectedCharacterId?: string | null;
  diceNotation: string;
  onDiceNotationChange: (value: string) => void;
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
  onAddCharacter,
  onRollD20,
  onSelectCharacter,
  onCombatRoll,
  onAdjustConsumable,
  onToggleLightSource,
  consumableAdjustingId,
  canEditCharacter,
  rollingCharacterId,
  rollingKind,
  combatRollByCharacter,
  selectedCharacterId,
  diceNotation,
  onDiceNotationChange,
}: GameSideMenuProps) {
  return (
    <Box
      sx={{
        width: 340,
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
                {characters.map((c) => (
                  <CharacterListItem
                    key={c.id}
                    character={c}
                    selected={selectedCharacterId === c.id}
                    onSelect={() => onSelectCharacter(c)}
                    onCombatRoll={(kind) => onCombatRoll(c, kind)}
                    onAdjustConsumable={(kind, delta) => onAdjustConsumable(c, kind, delta)}
                    onToggleLightSource={(using) => onToggleLightSource(c, using)}
                    consumableAdjusting={consumableAdjustingId === c.id}
                    canEditConsumables={canEditCharacter(c)}
                    rollingKind={
                      rollingCharacterId === c.id ? (rollingKind ?? null) : null
                    }
                    lastRoll={combatRollByCharacter?.[c.id]}
                  />
                ))}
              </List>
            )}
          </>
        )}

        {tab === 'dice' && (
          <>
            <TextField
              size="small"
              label="Notation"
              value={diceNotation}
              onChange={(e) => onDiceNotationChange(e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
              placeholder="1d20+2"
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<CasinoIcon />}
              onClick={onRollD20}
            >
              Roll (server)
            </Button>
            {lastRoll && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>{lastRoll.total}</strong> — [{lastRoll.rolls.join(', ')}]
                {lastRoll.modifier !== 0 && ` ${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier}`}
              </Alert>
            )}
          </>
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
