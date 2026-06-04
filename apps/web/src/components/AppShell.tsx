import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface AppShellProps {
  children: React.ReactNode;
  /** Hide game title link when on home */
  showBrandLink?: boolean;
  title?: string;
  actions?: React.ReactNode;
}

export function AppShell({
  children,
  showBrandLink = true,
  title,
  actions,
}: AppShellProps) {
  const { user, health, devLogin, logout } = useAuth();
  const [displayName, setDisplayName] = useState('Adventurer');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          {showBrandLink ? (
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              color="inherit"
              sx={{ flexGrow: title ? 0 : 1, mr: title ? 2 : 0 }}
            >
              <Typography variant="h6">DCC Web</Typography>
            </Link>
          ) : (
            <Typography variant="h6" sx={{ mr: 2 }}>
              DCC Web
            </Typography>
          )}
          {title && (
            <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
              {title}
            </Typography>
          )}
          {!title && <Box sx={{ flexGrow: 1 }} />}
          {health && (
            <Chip
              size="small"
              label={`API: ${health}`}
              color={health === 'ok' ? 'success' : 'warning'}
              sx={{ mr: 2 }}
            />
          )}
          {actions}
          {user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">{user.displayName}</Typography>
              <Button size="small" onClick={() => void logout()}>
                Logout
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{ width: 120 }}
              />
              <Button size="small" variant="contained" onClick={() => void devLogin(displayName)}>
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
      {children}
    </Box>
  );
}
