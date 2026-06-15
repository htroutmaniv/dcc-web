import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GamePage from './pages/GamePage';
import BestiaryPage from './pages/BestiaryPage';

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
              <BestiaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
