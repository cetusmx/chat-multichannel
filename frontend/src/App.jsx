import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/useAuthStore.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChatView from './pages/ChatView.jsx';
import Clients from './pages/Clients.jsx';
import Metrics from './pages/Metrics.jsx';
import Settings from './pages/Settings.jsx';
import History from './pages/History.jsx';
import UserListPage from './features/users/UserListPage.jsx';
import CreateUserForm from './features/users/CreateUserForm.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import ClientProfile from './pages/ClientProfile.jsx';
import useChatStore from './stores/useChatStore.js';
import useTabNotification from './hooks/useTabNotification.js';
import CoordinatorChatView from './features/chat/components/CoordinatorChatView.jsx';
import { Modal, Button, Toaster } from './components/ui/index.js';

const UIPreview = import.meta.env.DEV ? lazy(() => import('./dev/UIPreview.jsx')) : null;

function ChatRoute() {
  const user = useAuthStore(s => s.user);
  if (user?.role === 'VENDOR') {
    return <ChatView />;
  }
  return <CoordinatorChatView />;
}

/** Scrollable, padded container for document-style pages. */
function Page({ children }) {
  return <div className="h-full overflow-y-auto custom-scrollbar p-6">{children}</div>;
}

function AppLayout() {
  useTabNotification();

  useEffect(() => {
    useChatStore.getState().initializeSocket();
    useChatStore.getState().fetchConversations();

    return () => {
      useChatStore.getState().disconnectSocket();
    };
  }, []);

  return (
    <div className="flex h-screen bg-bg text-fg">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Page><Dashboard /></Page>} />
            <Route path="/chat" element={<ChatRoute />} />
            <Route path="/chat/:id" element={<ChatRoute />} />
            <Route path="/clients" element={<Page><Clients /></Page>} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/users" element={<Page><UserListPage /></Page>} />
            <Route path="/users/new" element={<Page><CreateUserForm onSuccess={() => window.location.href = '/users'} /></Page>} />
            <Route path="/metrics" element={<Page><Metrics /></Page>} />
            <Route path="/history" element={<Page><History /></Page>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Page><Settings /></Page>} />
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

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      eyebrow="Plan"
      title="Límite de asientos alcanzado"
      description="Has alcanzado el número de usuarios permitidos en tu plan actual. Para agregar más usuarios, actualiza tu plan."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cerrar</Button>
          <Button variant="primary" onClick={() => { setIsOpen(false); window.location.href = '/settings'; }}>Mejorar plan</Button>
        </>
      }
    />
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        {UIPreview && <Route path="/__ui" element={<Suspense fallback={null}><UIPreview /></Suspense>} />}
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
      <UpgradePlanModal />
      <Toaster />
    </>
  );
}
