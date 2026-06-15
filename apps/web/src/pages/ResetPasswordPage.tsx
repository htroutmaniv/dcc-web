import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatError } from '../utils/errors';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return;
    }
    void api<{ ok: boolean }>(`/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      await refresh();
      navigate('/?auth_success=reset', { replace: true });
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Box sx={{ maxWidth: 420, mx: 'auto', mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Choose a new password
          </Typography>

          {checking && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!checking && !tokenValid && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </Alert>
              <Button component={RouterLink} to="/" variant="contained" fullWidth>
                Back to sign in
              </Button>
            </>
          )}

          {!checking && tokenValid && (
            <Stack spacing={2}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <TextField
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
                autoComplete="new-password"
                required
              />
              <TextField
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                size="small"
                autoComplete="new-password"
                required
              />
              <Button
                variant="contained"
                disabled={submitting || !password || !confirmPassword}
                onClick={() => void handleSubmit()}
              >
                Update password
              </Button>
              <Link component={RouterLink} to="/" variant="body2" sx={{ alignSelf: 'center' }}>
                Back to sign in
              </Link>
            </Stack>
          )}
        </Paper>
      </Box>
    </AppShell>
  );
}
