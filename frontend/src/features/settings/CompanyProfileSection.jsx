import { useState, useEffect } from 'react';
import { get, put } from '../../services/api.js';

export default function CompanyProfileSection() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', domain: '', phone: '', email: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    get('/tenant/profile').then(async (res) => {
      const body = await res.json();
      if (res.ok) {
        setProfile(body.data);
        setForm({
          name: body.data.name || '',
          domain: body.data.domain || '',
          phone: body.data.phone || '',
          email: body.data.email || '',
          address: body.data.address || '',
        });
      } else {
        setError(body.error?.message || 'Error al cargar perfil');
      }
    }).catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await put('/tenant/profile', form);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      const body = await res.json();
      setProfile(body.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-sales-slate-400">Cargando...</p>;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-sales-slate-100">Perfil de la Empresa</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Perfil actualizado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Nombre de la empresa</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Dominio</label>
            <input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Teléfono</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Email de contacto</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm text-sales-slate-400">Dirección</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}
