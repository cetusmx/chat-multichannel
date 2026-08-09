import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Users, UserCog, BarChart3, Settings } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore.js';
import { Logo } from '../Logo.jsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/chat', icon: MessageSquare, label: 'Conversaciones', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/users', icon: UserCog, label: 'Usuarios', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/clients', icon: Users, label: 'Clientes', roles: ['ADMIN', 'COORDINATOR', 'VENDOR'] },
  { to: '/metrics', icon: BarChart3, label: 'Métricas', roles: ['ADMIN', 'COORDINATOR'] },
  { to: '/settings', icon: Settings, label: 'Configuración', roles: ['ADMIN', 'COORDINATOR'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  
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
              `flex h-12 w-full items-center gap-3 rounded-lg px-3 transition-colors ${
                isActive
                  ? 'bg-sales-coral/20 text-sales-coral font-medium'
                  : 'text-sales-slate-400 hover:bg-slate-800 hover:text-sales-slate-300'
              }`
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
