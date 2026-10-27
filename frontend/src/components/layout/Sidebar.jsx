import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Users, UserCog, BarChart3, Settings, History } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore.js';
import useChatStore from '../../stores/useChatStore.js';
import { Logo } from '../Logo.jsx';
import { cn } from '../../utils/cn.js';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/chat', icon: MessageSquare, label: 'Conversaciones', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'], badge: true },
  { to: '/history', icon: History, label: 'Historial', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/clients', icon: Users, label: 'Clientes', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/users', icon: UserCog, label: 'Usuarios', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/metrics', icon: BarChart3, label: 'Métricas', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/settings', icon: Settings, label: 'Configuración', roles: ['ADMIN', 'COORDINATOR'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const unreadCounts = useChatStore((s) => s.unreadCounts);

  const totalUnread = Object.values(unreadCounts || {}).reduce((acc, curr) => acc + curr, 0);

  const visibleNavItems = navItems.filter((item) =>
    !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="text-[15px] font-semibold tracking-tight text-fg">SalesFlow</span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3" aria-label="Principal">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                isActive
                  ? 'bg-surface-2 text-fg font-medium'
                  : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" aria-hidden />}
                <item.icon size={16} className={cn('shrink-0', isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted')} aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && totalUnread > 0 && (
                  <span className="tnum font-mono text-[10px] font-semibold rounded-sm bg-accent px-1.5 py-px text-accent-fg" aria-label={`${totalUnread} sin leer`}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-border px-4 py-3">
        <div className="eyebrow text-fg-subtle truncate" title={user?.tenantName}>{user?.tenantName || '—'}</div>
      </div>
    </aside>
  );
}
