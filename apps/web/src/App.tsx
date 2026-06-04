import { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { api, ApiError } from './api/client';

interface User {
  id: string;
  displayName: string;
}

interface Game {
  id: string;
  title: string;
  inviteCode: string;
  dmUserId: string;
}

interface Character {
  id: string;
  name: string;
  className: string;
  level: number;
  status: string;
  combat: { hpCurrent?: number; hpMax?: number; ac?: number };
}

interface DiceResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asDm, setAsDm] = useState<Game[]>([]);
  const [asPlayer, setAsPlayer] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceResult | null>(null);
  const [newGameTitle, setNewGameTitle] = useState('Thursday DCC');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('Adventurer');

  const activeGame =
    [...asDm, ...asPlayer].find((g) => g.id === activeGameId) ?? null;
  const isDm = activeGame ? asDm.some((g) => g.id === activeGame.id) : false;

  const showError = (e: unknown) => {
    setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed');
  };

  const loadMe = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      setError(null);
    } catch {
      setUser(null);
    }
  }, []);

  const loadGames = useCallback(async () => {
    const data = await api<{ asDm: Game[]; asPlayer: Game[] }>('/games');
    setAsDm(data.asDm);
    setAsPlayer(data.asPlayer);
    const all = [...data.asDm, ...data.asPlayer];
    if (all.length && !all.some((g) => g.id === activeGameId)) {
      setActiveGameId(all[0]!.id);
    }
  }, [activeGameId]);

  const loadCharacters = useCallback(async (gameId: string) => {
    const dm = asDm.some((g) => g.id === gameId);
    const q = dm ? '?includeDead=true' : '';
    const data = await api<{ characters: Character[] }>(
      `/games/${gameId}/characters${q}`,
    );
    setCharacters(data.characters);
  }, [asDm]);

  useEffect(() => {
    void api<{ status: string }>('/health')
      .then((h) => setHealth(h.status))
      .catch(() => setHealth('unreachable'));
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!user) return;
    void loadGames().catch(showError);
  }, [user, loadGames]);

  useEffect(() => {
    if (!activeGameId || !user) return;
    void loadCharacters(activeGameId).catch(showError);
  }, [activeGameId, user, loadCharacters]);

  const devLogin = async () => {
    try {
      await api('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      });
      await loadMe();
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const createGame = async () => {
    try {
      const { game } = await api<{ game: Game }>('/games', {
        method: 'POST',
        body: JSON.stringify({ title: newGameTitle }),
      });
      await loadGames();
      setActiveGameId(game.id);
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const joinGame = async () => {
    try {
      const { game } = await api<{ game: Game }>(
        `/games/join/${encodeURIComponent(inviteCode.trim())}`,
        { method: 'POST' },
      );
      await loadGames();
      setActiveGameId(game.id);
      setInviteCode('');
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const generateCharacter = async () => {
    if (!activeGameId) return;
    try {
      await api(`/games/${activeGameId}/characters/generate`, {
        method: 'POST',
        body: JSON.stringify({ level: 0 }),
      });
      await loadCharacters(activeGameId);
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const rollDice = async () => {
    if (!activeGameId) return;
    try {
      const { result } = await api<{ result: DiceResult }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId: activeGameId,
          notation: '1d20',
          reason: 'Test roll',
        }),
      });
      setLastRoll(result);
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const markDead = async (characterId: string) => {
    try {
      await api(`/characters/${characterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dead' }),
      });
      if (activeGameId) await loadCharacters(activeGameId);
    } catch (e) {
      showError(e);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            DCC Web
          </Typography>
          {health && (
            <Chip
              size="small"
              label={`API: ${health}`}
              color={health === 'ok' ? 'success' : 'warning'}
              sx={{ mr: 2 }}
            />
          )}
          {user ? (
            <>
              <Typography sx={{ mr: 2 }}>{user.displayName}</Typography>
              <Button
                size="small"
                onClick={() => api('/auth/logout', { method: 'POST' }).then(loadMe)}
              >
                Logout
              </Button>
            </>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{ width: 140 }}
              />
              <Button size="small" variant="contained" onClick={devLogin}>
                Dev login
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { window.location.href = '/api/auth/discord'; }}
              >
                Discord
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!user && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Get started
            </Typography>
            <Typography color="text.secondary">
              Log in with Dev login, then create or join a game to test rolls and characters.
            </Typography>
          </Paper>
        )}

        {user && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Games
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="New game title"
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={createGame}
                  >
                    Create game (DM)
                  </Button>
                  <Divider />
                  <TextField
                    size="small"
                    label="Invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={joinGame}>
                    Join game
                  </Button>
                </Stack>
                <List dense sx={{ mt: 2 }}>
                  {[...asDm, ...asPlayer]
                    .filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i)
                    .map((g) => (
                      <ListItem
                        key={g.id}
                        component="div"
                        onClick={() => setActiveGameId(g.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: g.id === activeGameId ? 'action.selected' : undefined,
                          borderRadius: 1,
                        }}
                      >
                        <ListItemText
                          primary={g.title}
                          secondary={`Code: ${g.inviteCode}${asDm.some((d) => d.id === g.id) ? ' · DM' : ''}`}
                        />
                      </ListItem>
                    ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                {!activeGame ? (
                  <Typography color="text.secondary">
                    Create or select a game to continue.
                  </Typography>
                ) : (
                  <>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                      sx={{ mb: 2 }}
                    >
                      <Box>
                        <Typography variant="h6">{activeGame.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Invite: {activeGame.inviteCode} · {isDm ? 'Dungeon Master' : 'Player'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={generateCharacter}
                        >
                          Generate character
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<CasinoIcon />}
                          onClick={rollDice}
                        >
                          Roll 1d20
                        </Button>
                      </Stack>
                    </Stack>

                    {lastRoll && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Rolled {lastRoll.notation}: [{lastRoll.rolls.join(', ')}]
                        {lastRoll.modifier !== 0 ? ` ${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier}` : ''}{' '}
                        = <strong>{lastRoll.total}</strong> (server authoritative)
                      </Alert>
                    )}

                    <Typography variant="subtitle1" gutterBottom>
                      Characters
                    </Typography>
                    {characters.length === 0 ? (
                      <Typography color="text.secondary">
                        No characters yet. Generate one to test.
                      </Typography>
                    ) : (
                      <List>
                        {characters.map((c) => (
                          <ListItem
                            key={c.id}
                            secondaryAction={
                              isDm && c.status === 'alive' ? (
                                <Button size="small" onClick={() => markDead(c.id)}>
                                  Mark dead
                                </Button>
                              ) : null
                            }
                          >
                            <ListItemText
                              primary={`${c.name} · ${c.className || '—'} (lvl ${c.level})`}
                              secondary={`${c.status} · HP ${c.combat?.hpCurrent ?? '?'}/${c.combat?.hpMax ?? '?'} · AC ${c.combat?.ac ?? '?'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
