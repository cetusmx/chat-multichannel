import { useState, useEffect } from 'react';
import { get, post } from '../../services/api.js';

export default function CreateUserForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'VENDOR', groupIds: [],
  });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/groups').then(async (res) => {
      const body = await res.json();
      if (res.ok) setGroups(body.data || []);
    });
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleGroupChange(groupId) {
    setForm((prev) => ({
      ...prev,
      groupIds: groupId ? [groupId] : [],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
        groupIds: form.role !== 'ADMIN' ? form.groupIds : undefined,
      };
      const res = await post('/users', payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error creating user');
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-sales-slate-100">Nuevo Usuario</h2>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-sales-slate-400">Nombre</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sales-slate-400">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sales-slate-400">Teléfono</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sales-slate-400">Contraseña</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sales-slate-400">Rol</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
          >
            <option value="ADMIN">Admin</option>
            <option value="COORDINATOR">Coordinador</option>
            <option value="VENDOR">Vendedor</option>
          </select>
        </div>
        {form.role === 'VENDOR' && (
          <p className="col-span-2 text-xs text-sales-slate-500">
            El coordinador se asigna automáticamente según el grupo seleccionado.
          </p>
        )}
      </div>

      {form.role !== 'ADMIN' && (
        <div>
          <label className="mb-2 block text-sm text-sales-slate-400">
            {form.role === 'VENDOR' ? 'Grupo' : 'Grupos'}
          </label>
          {form.role === 'VENDOR' ? (
            <select
              value={form.groupIds[0] || ''}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            >
              <option value="">Seleccionar grupo</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGroupChange(g.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.groupIds.includes(g.id)
                      ? 'bg-sales-coral/20 text-sales-coral ring-1 ring-sales-coral/50'
                      : 'bg-slate-800 text-sales-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Usuario'}
        </button>
        <button
          type="button"
          onClick={() => onSuccess?.()}
          className="rounded-lg border border-slate-700 px-6 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
