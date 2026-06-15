import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { formatError } from '../utils/errors';

type AuthMode = 'signin' | 'register' | 'forgot';

export function AuthForm() {
  const { register, login, resendVerification, forgotPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    resetMessages();
    if (next !== 'signin') setPendingVerification(false);
  };

  const handleRegister = async () => {
    resetMessages();
    setSubmitting(true);
    try {
      const result = await register({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });
      setPendingVerification(true);
      setInfo(result.message);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    resetMessages();
    setSubmitting(true);
    try {
      await login({ email, password });
      setPendingVerification(false);
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      if (msg.toLowerCase().includes('not verified')) {
        setPendingVerification(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    resetMessages();
    setSubmitting(true);
    try {
      const result = await resendVerification(email);
      setInfo(result.message);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    resetMessages();
    setSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setInfo(result.message);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Reset password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your account email and we will send a link to choose a new password.
        </Typography>

        {info && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
            {info}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            autoComplete="email"
            required
          />
          <Button
            variant="contained"
            disabled={submitting || !email}
            onClick={() => void handleForgotPassword()}
          >
            Send reset link
          </Button>
          <Button variant="text" size="small" onClick={() => switchMode('signin')}>
            Back to sign in
          </Button>
        </Stack>
      </Box>
    );
  }

  const tab = mode === 'signin' ? 0 : 1;

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => switchMode(v === 0 ? 'signin' : 'register')}
        sx={{ mb: 2 }}
      >
        <Tab label="Sign in" />
        <Tab label="Create account" />
      </Tabs>

      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        {mode === 'register' && (
          <TextField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            size="small"
            autoComplete="name"
          />
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          size="small"
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          size="small"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
        />
        {mode === 'signin' && (
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => switchMode('forgot')}
            sx={{ alignSelf: 'flex-start', cursor: 'pointer' }}
          >
            Forgot password?
          </Link>
        )}
        <Button
          variant="contained"
          disabled={submitting || !email || !password}
          onClick={() => void (mode === 'signin' ? handleLogin() : handleRegister())}
        >
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
        {pendingVerification && (
          <Button
            variant="text"
            size="small"
            disabled={submitting || !email}
            onClick={() => void handleResend()}
          >
            Resend verification email
          </Button>
        )}
        {mode === 'register' && (
          <Typography variant="caption" color="text.secondary">
            We will email you a verification link before you can sign in.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
