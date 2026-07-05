import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/useAuthStore.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChatView from './pages/ChatView.jsx';
import Clients from './pages/Clients.jsx';
import Metrics from './pages/Metrics.jsx';
import Settings from './pages/Settings.jsx';
import UserListPage from './features/users/UserListPage.jsx';
import CreateUserForm from './features/users/CreateUserForm.jsx';
import LoginPage from './features/auth/LoginPage.jsx';

function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/chat/:id" element={<ChatView />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/users/new" element={<CreateUserForm onSuccess={() => window.location.href = '/users'} />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
    </Routes>
  );
}
