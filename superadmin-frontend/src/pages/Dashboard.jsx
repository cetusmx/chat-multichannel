export default function Dashboard() {
  return (
    <div className="w-full">
      <header className="mb-10">
        <h2 className="text-3xl font-semibold tracking-tight">Bienvenido de nuevo</h2>
        <p className="text-slate-400 mt-1">Aquí puedes monitorear y administrar toda la plataforma SaaS.</p>
      </header>

      {/* Empty State Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Total Tenants</h3>
          <p className="text-3xl font-bold">--</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Tokens IA (Mensual)</h3>
          <p className="text-3xl font-bold">--</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Usuarios Activos</h3>
          <p className="text-3xl font-bold">--</p>
        </div>
      </div>
      
      <div className="mt-8 border-2 border-dashed border-slate-800 rounded-2xl h-64 flex items-center justify-center text-slate-500">
        El resto del dashboard se implementará en historias futuras.
      </div>
    </div>
  );
}
