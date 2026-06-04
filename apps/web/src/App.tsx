import { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { api } from './api/client';

interface User {
  id: string;
  displayName: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRoll, setLastRoll] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      setError(null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void loadMe();
    void api<{ status: string }>('/health')
      .then((h) => setHealth(h.status))
      .catch(() => setHealth('unreachable'));
  }, [loadMe]);

  const devLogin = async () => {
    await api('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Adventurer' }),
    });
    await loadMe();
  };

  const discordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  const testRoll = async () => {
    setLastRoll(null);
    setError('Create a game first to test server rolls (Phase 1 UI).');
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
            <>
              <Button size="small" onClick={devLogin} sx={{ mr: 1 }}>
                Dev login
              </Button>
              <Button size="small" variant="outlined" onClick={discordLogin}>
                Discord
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Session skeleton
          </Typography>
          <Typography color="text.secondary" paragraph>
            Server-authoritative dice, SQL character sheets (including dead),
            5&apos; grid movement radius, DM map reset, and optional movement
            approval are wired on the API. UI screens expand in later phases.
          </Typography>

          {error && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<CasinoIcon />}
              onClick={testRoll}
              disabled={!user}
            >
              Test dice (needs game)
            </Button>
          </Stack>

          {lastRoll && (
            <Typography sx={{ mt: 2 }}>Last roll: {lastRoll}</Typography>
          )}

          <Box component="ul" sx={{ mt: 3, color: 'text.secondary' }}>
            <li>Characters stored in PostgreSQL (alive + dead)</li>
            <li>POST /dice/roll — rolls never trusted from client</li>
            <li>POST /games/:id/characters/generate — random PC</li>
            <li>Map: reset tokens, clear map, movement approval setting</li>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
