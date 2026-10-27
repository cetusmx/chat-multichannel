import { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import useUIStore from '../../stores/useUIStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { disconnectSockets } from '../../services/socket.js';
import { useNavigate, useLocation } from 'react-router-dom';
import GlobalSearchInput from '../search/GlobalSearchInput.jsx';
import { Avatar, Eyebrow, IconButton, EmptyState } from '../ui/index.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import { formatTime } from '../../utils/formatDate.js';
import { getTheme, toggleTheme } from '../../utils/theme.js';
import { cn } from '../../utils/cn.js';

const SECTION_TITLES = [
  { match: /^\/chat/, label: 'Bandeja de ventas' },
  { match: /^\/history/, label: 'Historial' },
  { match: /^\/clients\/.+/, label: 'Perfil de cliente' },
  { match: /^\/clients/, label: 'Clientes' },
  { match: /^\/users/, label: 'Usuarios' },
  { match: /^\/metrics/, label: 'Métricas' },
  { match: /^\/search/, label: 'Búsqueda' },
  { match: /^\/settings/, label: 'Configuración' },
  { match: /^\/$/, label: 'Dashboard' },
];

function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [ref, onOutside, active]);
}

export default function Header() {
  const notifications = useUIStore((state) => state.notifications);
  const markNotificationsAsRead = useUIStore((state) => state.markNotificationsAsRead);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useClickOutside(notifRef, () => setShowNotifications(false), showNotifications);
  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  const section = SECTION_TITLES.find((s) => s.match.test(location.pathname))?.label || 'SalesFlow';

  function handleLogout() {
    setShowMenu(false);
    clearAuth();
    disconnectSockets();
    navigate('/login', { replace: true });
  }

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5">
      <div className="flex min-w-0 items-center gap-5">
        <Eyebrow tone="default" className="shrink-0">{section}</Eyebrow>
        <div className="hidden w-72 md:block lg:w-96">
          <GlobalSearchInput />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative" ref={notifRef}>
          <IconButton
            icon={Bell}
            label={unreadCount > 0 ? `Notificaciones (${unreadCount} nuevas)` : 'Notificaciones'}
            size="lg"
            onClick={() => { setShowNotifications(!showNotifications); markNotificationsAsRead(); }}
            aria-expanded={showNotifications}
            className="relative"
          />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden />
          )}

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <Eyebrow tone="muted">Notificaciones</Eyebrow>
                {notifications.length > 0 && (
                  <button onClick={() => useUIStore.getState().clearNotifications()} className="text-xs text-fg-muted hover:text-fg">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <EmptyState compact icon={Bell} title="Sin notificaciones" description="Aquí verás alertas de SLA, asignaciones y escalaciones." />
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="border-b border-border/60 px-4 py-3 last:border-0 hover:bg-surface-2/60">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-fg leading-snug">{n.title}</p>
                        <span className="tnum shrink-0 font-mono text-[10px] text-fg-subtle">{formatTime(n.date)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-fg-muted leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
            className="flex h-9 items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
          >
            <Avatar name={user?.name} size="sm" />
            <span className="hidden text-sm font-medium text-fg sm:block">{user?.name}</span>
            <ChevronDown size={14} className={cn('text-fg-subtle transition-transform', showMenu && 'rotate-180')} aria-hidden />
          </button>

          {showMenu && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-2xl shadow-black/40">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-fg">{user?.name}</p>
                <p className="truncate text-xs text-fg-muted">{user?.email}</p>
                <Eyebrow tone="accent" className="mt-2 block">{ROLE_LABELS[user?.role] || user?.role}</Eyebrow>
              </div>
              <button
                role="menuitem"
                onClick={() => setTheme(toggleTheme())}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
                {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              </button>
              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <LogOut size={15} aria-hidden />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
