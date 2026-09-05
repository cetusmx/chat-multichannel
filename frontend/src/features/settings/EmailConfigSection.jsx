import { useState, useEffect } from 'react';
import { get, put } from '../../services/api';
import toast from 'react-hot-toast';

export default function EmailConfigSection() {
  const [config, setConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    user: '',
    password: '',
    fromName: '',
    fromEmail: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await get('/tenant/email-config');
      if (res.data?.isConfigured) {
        setConfig({
          host: res.data.host || '',
          port: res.data.port || 465,
          secure: res.data.secure !== false,
          user: res.data.user || '',
          password: res.data.password || '',
          fromName: res.data.fromName || '',
          fromEmail: res.data.fromEmail || ''
        });
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Error fetching email config:', error);
      toast.error('Error al cargar configuración SMTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await put('/tenant/email-config', config);
      toast.success('Configuración SMTP guardada');
      setIsConfigured(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sales-slate-400">Cargando...</div>;

  return (
    <div className="bg-sales-slate-800 rounded-lg p-6 border border-slate-700 max-w-2xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-medium text-sales-slate-100">Configuración SMTP (Cotizaciones)</h2>
          <p className="text-sm text-sales-slate-400 mt-1">
            Configura el servidor de correo saliente para enviar cotizaciones a los clientes.
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isConfigured ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
          {isConfigured ? 'Configurado' : 'Sin Configurar'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Host SMTP
            </label>
            <input
              type="text"
              required
              placeholder="smtp.gmail.com"
              value={config.host}
              onChange={e => setConfig({ ...config, host: e.target.value })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Puerto
            </label>
            <input
              type="number"
              required
              value={config.port}
              onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Usuario (Correo)
            </label>
            <input
              type="text"
              required
              value={config.user}
              onChange={e => setConfig({ ...config, user: e.target.value })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={config.password}
              onChange={e => setConfig({ ...config, password: e.target.value })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Nombre del Remitente (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Ventas Empresa"
              value={config.fromName}
              onChange={e => setConfig({ ...config, fromName: e.target.value })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sales-slate-300 mb-1">
              Correo Remitente (Opcional)
            </label>
            <input
              type="email"
              value={config.fromEmail}
              onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
              className="w-full bg-sales-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sales-slate-100 focus:outline-none focus:ring-1 focus:ring-sales-coral focus:border-sales-coral"
            />
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="secure"
            checked={config.secure}
            onChange={e => setConfig({ ...config, secure: e.target.checked })}
            className="h-4 w-4 rounded border-slate-700 text-sales-coral focus:ring-sales-coral bg-sales-slate-900"
          />
          <label htmlFor="secure" className="ml-2 block text-sm text-sales-slate-300">
            Usar conexión segura (SSL/TLS)
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-sales-coral text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sales-coral disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
