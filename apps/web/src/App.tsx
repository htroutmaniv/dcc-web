import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const GamePage = lazy(() => import('./pages/GamePage'));
const BestiaryPage = lazy(() => import('./pages/BestiaryPage'));

function RouteLoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/bestiary"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingFallback />}>
                <BestiaryPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoadingFallback />}>
                <GamePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
