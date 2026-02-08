import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { AIEditorPage } from './pages/AIEditorPage';
import './App.css';

/**
 * Main App Component
 * 
 * Sets up routing and authentication:
 * - /login - Login page (public)
 * - /register - Registration page (public)
 * - /documents - Document editor (protected)
 * - / - Redirects to /documents if authenticated, /login if not
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-editor"
            element={
              <ProtectedRoute>
                <AIEditorPage />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/documents" replace />} />
          
          {/* Catch all - redirect to documents */}
          <Route path="*" element={<Navigate to="/documents" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
