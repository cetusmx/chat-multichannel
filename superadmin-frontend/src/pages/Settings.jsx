import { useState, useEffect } from 'react';
import { Mail, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    user: '',
    password: '',
    fromName: 'SalesFlow Platform',
    fromEmail: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/superadmin/auth/email-config');
        const data = res?.data || res;
        if (data?.isConfigured) {
          setConfig({
            host: data.host || '',
            port: data.port || 465,
            secure: data.secure !== false,
            user: data.user || '',
            password: data.password || '',
            fromName: data.fromName || 'SalesFlow Platform',
            fromEmail: data.fromEmail || '',
          });
          setIsConfigured(true);
        }
      } catch (err) {
        toast.error('No se pudo cargar la configuración SMTP de plataforma');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/api/superadmin/auth/email-config', {
        ...config,
        port: Number(config.port) || 465,
      });
      setIsConfigured(true);
      toast.success('Configuración SMTP de plataforma guardada exitosamente');
    } catch (err) {
      toast.error(err.message || 'Error al guardar la configuración SMTP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Configuración de Plataforma</h2>
          <p className="text-slate-400 mt-1">
            Servidor SMTP propio de Superadmin para envío de bienvenidas a nuevos inquilinos y recuperación de cuentas.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {isConfigured ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {isConfigured ? 'SMTP Configurado' : 'Sin configurar'}
        </span>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-white">
          <Mail className="text-blue-400" size={20} />
          Servidor de Correo Saliente (SMTP Global)
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-400" size={24} />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Servidor SMTP *</label>
                <input
                  type="text"
                  required
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="smtp.tudominio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Puerto *</label>
                <input
                  type="number"
                  required
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  placeholder="465"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Usuario SMTP *</label>
                <input
                  type="text"
                  required
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  placeholder="notificaciones@tudominio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Contraseña SMTP *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nombre del remitente</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="SalesFlow Platform"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Correo del remitente</label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  placeholder="no-reply@tudominio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.secure}
                onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600"
              />
              Usar conexión segura (SSL/TLS)
            </label>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
