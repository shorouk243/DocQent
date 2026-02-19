import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { AIEditorPage } from './pages/AIEditorPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
          
          <Route path="/" element={<Navigate to="/documents" replace />} />
          
          <Route path="*" element={<Navigate to="/documents" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
