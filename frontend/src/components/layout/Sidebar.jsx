import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Users, UserCog, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Conversaciones' },
  { to: '/users', icon: UserCog, label: 'Usuarios' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/metrics', icon: BarChart3, label: 'Métricas' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col gap-4 border-r border-slate-800 bg-slate-900 py-4 px-3 flex-shrink-0">
      <div className="mb-4 flex h-12 w-full items-center gap-3 px-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sales-coral to-sales-orange text-sm font-bold text-white">
          SF
        </div>
        <span className="font-bold text-white text-lg tracking-wide">SalesFlow</span>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
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
