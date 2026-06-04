import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import type { Game } from '../types/game';
import { formatError } from '../utils/errors';

function uniqueGames(asDm: Game[], asPlayer: Game[]): Game[] {
  const seen = new Set<string>();
  return [...asDm, ...asPlayer].filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [asDm, setAsDm] = useState<Game[]>([]);
  const [asPlayer, setAsPlayer] = useState<Game[]>([]);
  const [newGameTitle, setNewGameTitle] = useState('Thursday DCC');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      const data = await api<{ asDm: Game[]; asPlayer: Game[] }>('/games');
      setAsDm(data.asDm);
      setAsPlayer(data.asPlayer);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadGames();
  }, [user, loadGames]);

  const createGame = async () => {
    try {
      const { game } = await api<{ game: Game }>('/games', {
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
      const { game } = await api<{ game: Game }>(
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

  const games = uniqueGames(asDm, asPlayer);

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Typography variant="h4" gutterBottom fontFamily="Cinzel, serif">
          Your games
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Create a session as DM, join with an invite code, or open an active game.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!user && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sign in to continue
            </Typography>
            <Typography color="text.secondary">
              Use Dev login or Discord in the header, then return here to manage games.
            </Typography>
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
                    Create game (DM)
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
                    Active games
                  </Typography>
                  <Button size="small" onClick={loadGames} disabled={loadingGames}>
                    Refresh
                  </Button>
                </Stack>
                {games.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <SportsEsportsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No games yet. Create one or join with a code.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {games.map((g) => {
                      const dm = asDm.some((d) => d.id === g.id);
                      return (
                        <ListItemButton
                          key={g.id}
                          onClick={() => navigate(`/game/${g.id}`)}
                          sx={{ borderRadius: 1, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={g.title}
                            secondary={`Invite: ${g.inviteCode}`}
                          />
                          <Chip
                            size="small"
                            label={dm ? 'DM' : 'Player'}
                            color={dm ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </ListItemButton>
                      );
                    })}
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
