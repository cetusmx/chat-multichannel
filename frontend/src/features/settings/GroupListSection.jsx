import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Plus } from 'lucide-react';
import { get, post, put, del } from '../../services/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';

function GroupForm({ group, branches, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: group?.name || '',
    description: group?.description || '',
    branchId: group?.branchId || (branches[0]?.id || ''),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = group
        ? await put(`/groups/${group.id}`, form)
        : await post('/groups', form);
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
            {group ? 'Editar Grupo' : 'Nuevo Grupo'}
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
            <label className="mb-1 block text-sm text-sales-slate-400">Descripción</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sales-slate-400">Sucursal</label>
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            >
              <option value="">Seleccionar sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
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

export default function GroupListSection() {
  const [groups, setGroups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, branchesRes] = await Promise.all([get('/groups'), get('/branches')]);
      const groupsBody = await groupsRes.json();
      const branchesBody = await branchesRes.json();
      if (groupsRes.ok) setGroups(groupsBody.data || []);
      if (branchesRes.ok) setBranches(branchesBody.data || []);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleDelete(group) {
    setDeleteError('');
    try {
      const res = await del(`/groups/${group.id}`);
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error?.message || 'Error al eliminar');
        return;
      }
      setConfirmDelete(null);
      loadData();
    } catch {
      setDeleteError('Error de conexión');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sales-slate-100">Grupos</h3>
        <button
          onClick={() => { setEditingGroup(null); setShowForm(true); }}
          className="flex items-center gap-1 rounded-lg bg-sales-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-sales-slate-400">Cargando...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-sales-slate-400">No hay grupos registrados.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-sales-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-left font-medium">Sucursal</th>
                <th className="px-4 py-3 text-left font-medium">Coordinador</th>
                <th className="px-4 py-3 text-center font-medium">Vendedores</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {groups.map((g) => (
                <tr key={g.id} className="text-sales-slate-300 hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-sales-slate-100">{g.name}</td>
                  <td className="px-4 py-3">{g.description || '—'}</td>
                  <td className="px-4 py-3 text-sales-slate-400">{g.branch?.name || '—'}</td>
                  <td className="px-4 py-3 text-sales-slate-300">{g.coordinator?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">{g.vendorCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingGroup(g); setShowForm(true); }}
                      className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-sales-slate-200 transition-colors"
                      title="Editar grupo"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(g)}
                      className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                      title="Eliminar grupo"
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

      {deleteError && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{deleteError}</div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar grupo"
        message={`¿Estás seguro de eliminar el grupo "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {showForm && (
        <GroupForm
          group={editingGroup}
          branches={branches}
          onSave={() => { setShowForm(false); loadData(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
