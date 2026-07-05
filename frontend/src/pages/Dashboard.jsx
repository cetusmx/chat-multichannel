import useAuthStore from '../stores/useAuthStore';
import CoordinatorDashboard from '../features/chat/components/CoordinatorDashboard';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'COORDINATOR' || user?.role === 'ADMIN') {
    return <CoordinatorDashboard />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-sales-slate-100">Dashboard de Vendedor</h1>
      <p className="mt-2 text-sales-slate-400">Bienvenido a SalesFlow, {user?.name}</p>
    </div>
  );
}
