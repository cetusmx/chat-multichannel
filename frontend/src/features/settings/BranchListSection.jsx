import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Plus } from 'lucide-react';
import { get, post, put, del } from '../../services/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';

function BranchForm({ branch, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = branch
        ? await put(`/branches/${branch.id}`, form)
        : await post('/branches', form);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al guardar');
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-sales-slate-100">
            {branch ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1 text-sales-slate-400 hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-700 px-6 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BranchListSection() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadBranches() {
    setLoading(true);
    setError('');
    try {
      const res = await get('/branches');
      const body = await res.json();
      if (res.ok) {
        setBranches(body.data || []);
      } else {
        setError(body.error?.message || 'Error al cargar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBranches(); }, []);

  async function handleDelete(branch) {
    setDeleteError('');
    try {
      const res = await del(`/branches/${branch.id}`);
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error?.message || 'Error al eliminar');
        return;
      }
      setConfirmDelete(null);
      loadBranches();
    } catch {
      setDeleteError('Error de conexión');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sales-slate-100">Sucursales</h3>
        <button
          onClick={() => { setEditingBranch(null); setShowForm(true); }}
          className="flex items-center gap-1 rounded-lg bg-sales-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-sales-slate-400">Cargando...</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-sales-slate-400">No hay sucursales registradas.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-sales-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Dirección</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-center font-medium">Grupos</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {branches.map((b) => (
                <tr key={b.id} className="text-sales-slate-300 hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-sales-slate-100">{b.name}</td>
                  <td className="px-4 py-3">{b.address || '—'}</td>
                  <td className="px-4 py-3">{b.phone || '—'}</td>
                  <td className="px-4 py-3 text-center">{b.groupCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingBranch(b); setShowForm(true); }}
                      className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-sales-slate-200 transition-colors"
                      title="Editar sucursal"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(b)}
                      className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                      title="Eliminar sucursal"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <BranchForm
          branch={editingBranch}
          onSave={() => { setShowForm(false); loadBranches(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
