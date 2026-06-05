import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import type { GameListEntry } from '../types/game';
import { authErrorMessage } from '../utils/auth-errors';
import { formatError } from '../utils/errors';

export default function HomePage() {
  const { user, loading: authLoading, authConfig, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [gameEntries, setGameEntries] = useState<GameListEntry[]>([]);
  const [newGameTitle, setNewGameTitle] = useState('Thursday DCC');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  const [authBanner, setAuthBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    if (!user) {
      setGameEntries([]);
      return;
    }
    setLoadingGames(true);
    try {
      const data = await api<{ games: GameListEntry[] }>('/games');
      setGameEntries(data.games ?? []);
      setError(null);
    } catch (e) {
      setError(formatError(e));
      setGameEntries([]);
    } finally {
      setLoadingGames(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadGames();
    else setGameEntries([]);
  }, [user, loadGames]);

  useEffect(() => {
    const errorCode = searchParams.get('auth_error');
    if (errorCode) {
      setAuthBanner(authErrorMessage(errorCode));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('auth_error');
          return next;
        },
        { replace: true },
      );
    }
    if (searchParams.get('auth_success') === '1') {
      setAuthBanner(null);
      setInfoBanner('Email verified — you are signed in.');
      void refresh();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('auth_success');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, refresh, setSearchParams]);

  const createGame = async () => {
    try {
      const { game } = await api<{ game: GameListEntry['game']; role: 'dm' }>('/games', {
        method: 'POST',
        body: JSON.stringify({ title: newGameTitle }),
      });
      await loadGames();
      navigate(`/game/${game.id}`);
    } catch (e) {
      setError(formatError(e));
    }
  };

  const joinGame = async () => {
    try {
      const { game } = await api<{ game: GameListEntry['game']; role: string }>(
        `/games/join/${encodeURIComponent(inviteCode.trim())}`,
        { method: 'POST' },
      );
      setInviteCode('');
      await loadGames();
      navigate(`/game/${game.id}`);
    } catch (e) {
      setError(formatError(e));
    }
  };

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Typography variant="h4" gutterBottom fontFamily="Cinzel, serif">
          Your games
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in to see sessions you run or have joined. Only the game creator has DM tools.
        </Typography>

        {infoBanner && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfoBanner(null)}>
            {infoBanner}
          </Alert>
        )}

        {authBanner && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthBanner(null)}>
            {authBanner}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {authLoading && (
          <Typography color="text.secondary">Loading account…</Typography>
        )}

        {!authLoading && !user && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sign in to continue
            </Typography>
            <Typography color="text.secondary" paragraph>
              Sign in to create or join games. You will only see sessions you run or have joined.
            </Typography>
            {authConfig.emailAuth ? (
              <AuthForm />
            ) : authConfig.devLogin ? (
              <Typography variant="body2" color="text.secondary">
                Use <strong>Dev DM</strong> or <strong>Dev Player</strong> in the header for local
                testing.
              </Typography>
            ) : (
              <Typography variant="body2" color="warning.main">
                Sign-in is not configured on this server.
              </Typography>
            )}
          </Paper>
        )}

        {user && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  New session
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Game title"
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={createGame}
                  >
                    Create game (you are DM)
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/bestiary"
                    variant="outlined"
                    fullWidth
                    startIcon={<MenuBookIcon />}
                  >
                    Bestiary editor
                  </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Join session
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    fullWidth
                    placeholder="e.g. BQQ7Q6M5"
                  />
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<LoginIcon />}
                    onClick={joinGame}
                    disabled={!inviteCode.trim()}
                  >
                    Join game
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, minHeight: 280 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Your active games
                  </Typography>
                  <Button size="small" onClick={loadGames} disabled={loadingGames}>
                    Refresh
                  </Button>
                </Stack>
                {gameEntries.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <SportsEsportsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No games yet. Create one or join with an invite code.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {gameEntries.map(({ game, role }) => (
                      <ListItemButton
                        key={game.id}
                        onClick={() => navigate(`/game/${game.id}`)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemText
                          primary={game.title}
                          secondary={`Invite: ${game.inviteCode}`}
                        />
                        <Chip
                          size="small"
                          label={role === 'dm' ? 'DM (creator)' : 'Player'}
                          color={role === 'dm' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </AppShell>
  );
}
