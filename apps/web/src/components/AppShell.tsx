import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

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
  const { user, health, authConfig, devLogin, logout } = useAuth();

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppBar position="static" color="transparent" elevation={0} sx={{ flexShrink: 0 }}>
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
              {user.avatarUrl && (
                <Avatar src={user.avatarUrl} alt="" sx={{ width: 28, height: 28 }} />
              )}
              <Typography variant="body2">{user.displayName}</Typography>
              <Button size="small" onClick={() => void logout()}>
                Logout
              </Button>
            </Stack>
          ) : (
            authConfig.devLogin && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => void devLogin('dm')}
                >
                  Dev DM
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={() => void devLogin('player')}
                >
                  Dev Player
                </Button>
              </Stack>
            )
          )}
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
