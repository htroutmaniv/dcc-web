import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { formatError } from '../utils/errors';

export function AuthForm() {
  const { register, login, resendVerification } = useAuth();
  const [tab, setTab] = useState(0);
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

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => { setTab(v); resetMessages(); }} sx={{ mb: 2 }}>
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
        {tab === 1 && (
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
          autoComplete={tab === 0 ? 'current-password' : 'new-password'}
          required
        />
        <Button
          variant="contained"
          disabled={submitting || !email || !password}
          onClick={() => void (tab === 0 ? handleLogin() : handleRegister())}
        >
          {tab === 0 ? 'Sign in' : 'Create account'}
        </Button>
        {pendingVerification && (
          <Button variant="text" size="small" disabled={submitting || !email} onClick={() => void handleResend()}>
            Resend verification email
          </Button>
        )}
        {tab === 1 && (
          <Typography variant="caption" color="text.secondary">
            We will email you a verification link before you can sign in.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
