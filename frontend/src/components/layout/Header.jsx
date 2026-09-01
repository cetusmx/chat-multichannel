import { useState } from 'react';
import { Search, Bell, LogOut, ChevronDown } from 'lucide-react';
import useUIStore from '../../stores/useUIStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { disconnectSockets } from '../../services/socket.js';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const notifications = useUIStore((state) => state.notifications);
  const markNotificationsAsRead = useUIStore((state) => state.markNotificationsAsRead);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const roleLabels = { ADMIN: 'Admin', COORDINATOR: 'Coordinador', VENDOR: 'Vendedor' };
  const roleColors = {
    ADMIN: 'text-sales-coral',
    COORDINATOR: 'text-sales-orange',
    VENDOR: 'text-sales-slate-400',
  };
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  function handleLogout() {
    setShowMenu(false);
    clearAuth();
    disconnectSockets();
    navigate('/login', { replace: true });
  }

  return (
    <header className="relative z-50 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-sales-slate-100">{user?.tenantName}</span>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-sales-slate-400">
          <Search size={16} />
          <span className="hidden sm:inline">Buscar... (Ctrl+K)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); markNotificationsAsRead(); }}
            className="relative rounded-lg p-2 text-sales-slate-400 hover:bg-slate-800 hover:text-sales-slate-300 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sales-coral text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-sales-slate-900 border border-sales-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-sales-slate-800 bg-sales-slate-800/50">
                <h3 className="font-medium text-white">Notificaciones</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-sales-slate-400">
                    No tienes notificaciones
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-sales-slate-800/50 hover:bg-sales-slate-800/30 transition-colors">
                      <div className="text-sm font-medium text-white mb-0.5">{n.title}</div>
                      <div className="text-xs text-sales-slate-400 leading-relaxed">{n.message}</div>
                      <div className="text-[10px] text-sales-slate-500 mt-2 text-right">
                        {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-800 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sales-coral to-sales-orange text-xs font-bold text-white ring-2 ring-slate-700">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-sales-slate-100">{user?.name}</p>
              <p className={`text-[11px] leading-tight ${roleColors[user?.role] || 'text-sales-slate-400'}`}>
                {roleLabels[user?.role] || user?.role}
              </p>
            </div>
            <ChevronDown size={14} className="text-sales-slate-500" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-700/50 bg-slate-900 py-2 shadow-2xl">
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="text-sm font-medium text-sales-slate-100">{user?.name}</p>
                  <p className="text-xs text-sales-slate-400">{user?.email}</p>
                  <p className="mt-1 text-xs text-sales-slate-500">{user?.tenantName}</p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-sales-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
