import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Users, UserCog, BarChart3, Settings } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore.js';
import useChatStore from '../../stores/useChatStore.js';
import { Logo } from '../Logo.jsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/chat', icon: MessageSquare, label: 'Conversaciones', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'], badge: true },
  { to: '/users', icon: UserCog, label: 'Usuarios', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/clients', icon: Users, label: 'Clientes', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/metrics', icon: BarChart3, label: 'Métricas', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/settings', icon: Settings, label: 'Configuración', roles: ['ADMIN', 'COORDINATOR'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  
  const totalUnread = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
  
  // Filtrar los items de navegación según el rol del usuario
  const visibleNavItems = navItems.filter((item) => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="flex w-64 flex-col gap-4 border-r border-slate-800 bg-slate-900 py-4 px-3 flex-shrink-0">
      <div className="mb-4 flex h-12 w-full items-center gap-3 px-3">
        <Logo className="flex-shrink-0 w-10 h-10" />
        <span className="font-bold text-white text-lg tracking-wide">SalesFlow</span>
      </div>
      <nav className="flex flex-col gap-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex h-12 w-full items-center gap-3 rounded-md px-3 transition-all relative overflow-hidden ${
                isActive
                  ? 'bg-slate-800 text-white font-medium before:absolute before:left-0 before:top-[25%] before:bottom-[25%] before:w-1 before:bg-[#2f81f7] before:rounded-full'
                  : 'text-sales-slate-400 hover:bg-slate-800/50 hover:text-sales-slate-300'
              }`
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && totalUnread > 0 && (
              <span className="bg-sales-coral text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-sales-coral/20 animate-pulse">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
