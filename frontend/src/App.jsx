import { useState, useEffect } from 'react';
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
import useTabNotification from './hooks/useTabNotification.js';

function AppLayout() {
  useTabNotification();
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6 min-w-0">
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

function UpgradePlanModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('QUOTA_EXCEEDED_MODAL', handler);
    return () => window.removeEventListener('QUOTA_EXCEEDED_MODAL', handler);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-sales-slate-100 mb-2">Límite de Asientos Alcanzado</h3>
        <p className="text-sm text-sales-slate-400 mb-6">
          Has alcanzado el límite de usuarios permitidos en tu plan actual. Para agregar más usuarios, por favor actualiza tu plan.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors">
            Cerrar
          </button>
          <button onClick={() => { setIsOpen(false); window.location.href = '/settings'; }} className="rounded-lg bg-sales-orange px-4 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors">
            Mejorar Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
      <UpgradePlanModal />
    </>
  );
}
