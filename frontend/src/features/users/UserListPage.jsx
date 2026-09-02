import { useEffect, useState } from 'react';
import { Pencil, X, Trash2 } from 'lucide-react';
import { get, put } from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';

const roleLabels = { ADMIN: 'Admin', COORDINATOR: 'Coordinador', VENDOR: 'Vendedor' };
const badgeColors = {
  ADMIN: 'bg-sales-coral/20 text-sales-coral',
  COORDINATOR: 'bg-sales-orange/20 text-sales-orange',
  VENDOR: 'bg-slate-700 text-sales-slate-300',
};

function ConfirmDeactivateModal({ user, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setError('');
    setLoading(true);
    try {
      const payload = { isActive: false };
      const res = await put(`/users/${user.id}`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al borrar usuario');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-sales-slate-100 mb-2">Confirmar Eliminación</h3>
        <p className="text-sm text-sales-slate-400 mb-6">
          ¿Estás seguro de que deseas desactivar (borrar) al usuario <strong>{user.name}</strong>?
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-sales-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Borrando...' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [isActive, setIsActive] = useState(user.isActive !== false);
  const [groupIds, setGroupIds] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [role, setRole] = useState(user.role);
  const [vendorCount, setVendorCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role === 'ADMIN') return;

    Promise.all([
      get(`/users/${user.id}`),
      get('/groups'),
    ]).then(async ([userRes, groupsRes]) => {
      const userBody = await userRes.json();
      const groupsBody = await groupsRes.json();
      if (userRes.ok) {
        setForm((prev) => ({
          ...prev,
          name: userBody.data.name,
          email: userBody.data.email,
          phone: userBody.data.phone || '',
        }));
        setIsActive(userBody.data.isActive !== false);
        setRole(userBody.data.role);
        setVendorCount(userBody.data.vendorCount || 0);
        if (userBody.data.groups) {
          if (userBody.data.role === 'VENDOR' && userBody.data.groups.length > 0) {
            setGroupIds([userBody.data.groups[0].id]);
          } else {
            setGroupIds(userBody.data.groups.map((g) => g.id));
          }
        }
      }
      if (groupsRes.ok) setAllGroups(groupsBody.data || []);
    });
  }, [user.id, user.role]);

  function handleGroupChange(groupId) {
    setGroupIds(groupId ? [groupId] : []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, isActive };
      if (user.role !== 'ADMIN') {
        payload.groupIds = groupIds;
      }
      const res = await put(`/users/${user.id}`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al actualizar');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-sales-slate-100">Editar Usuario</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-sales-slate-400 hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${badgeColors[role] || ''}`}>
            {roleLabels[role] || role}
          </span>
          {role === 'COORDINATOR' && (
            <span className="text-xs text-sales-slate-400">
              {vendorCount} vendedor{vendorCount !== 1 ? 'es' : ''} asignado{vendorCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

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
            <label className="mb-1 block text-sm text-sales-slate-400">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sales-coral focus:ring-sales-coral/50"
            />
            <label htmlFor="isActiveToggle" className="text-sm text-sales-slate-100">
              Usuario Activo
            </label>
          </div>

          {user.role === 'VENDOR' && (
            <p className="text-xs text-sales-slate-500">
              El coordinador se asigna automáticamente según el grupo seleccionado.
            </p>
          )}
          {user.role !== 'ADMIN' && allGroups.length > 0 && (
            <div>
              <label className="mb-2 block text-sm text-sales-slate-400">
                {user.role === 'VENDOR' ? 'Grupo' : 'Grupos'}
              </label>
              {user.role === 'VENDOR' ? (
                <select
                  value={groupIds[0] || ''}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
                >
                  <option value="">Seleccionar grupo</option>
                  {allGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleGroupChange(g.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        groupIds.includes(g.id)
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

          <div className="flex gap-3 pt-2 w-full">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sales-orange px-6 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
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

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [tenantProfile, setTenantProfile] = useState(null);
  const user = useAuthStore((s) => s.user);

  async function loadTenantProfile() {
    try {
      const res = await get('/tenant/profile');
      if (res.ok) {
        const body = await res.json();
        setTenantProfile(body.data);
      }
    } catch (err) {}
  }

  async function loadUsers(page = 1) {
    setLoading(true);
    setError('');
    try {
      const usersRes = await get(`/users?${new URLSearchParams({ page, limit: 20, ...(role ? { role } : {}), ...(search ? { search } : {}) })}`);

      const res = usersRes;
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError('No tienes permiso para ver esta sección.');
        } else {
          setError(body.error?.message || 'Error al cargar usuarios');
        }
        setUsers([]);
        return;
      }
      setUsers(body.data || []);
      setMeta(body.meta || { total: 0, page: 1, limit: 20 });
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function refreshAfterEdit() {
    loadUsers(meta.page);
    loadTenantProfile();
  }

  useEffect(() => {
    loadUsers();
  }, [role]);

  useEffect(() => {
    loadTenantProfile();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sales-slate-100">Usuarios</h1>

        {user?.role !== 'VENDOR' && (
          <div className="flex items-center gap-4">
            {tenantProfile && tenantProfile.maxUsers !== -1 && (
              <span className="text-sm font-medium text-sales-slate-300">
                Asientos: {tenantProfile.currentUsersCount}/{tenantProfile.maxUsers}
              </span>
            )}
            {tenantProfile && tenantProfile.maxUsers !== -1 && tenantProfile.currentUsersCount >= tenantProfile.maxUsers ? (
              <a
                href={undefined}
                aria-disabled={true}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-sales-slate-400 cursor-not-allowed"
                title="Límite de asientos alcanzado"
                onClick={(e) => e.preventDefault()}
              >
                + Nuevo Usuario
              </a>
            ) : (
              <a
                href="/users/new"
                className="rounded-lg bg-sales-orange px-4 py-2 text-sm font-medium text-white hover:bg-sales-orange-light transition-colors"
              >
                + Nuevo Usuario
              </a>
            )}
          </div>
        )}
      </div>

      {user?.role === 'VENDOR' ? (
        <div className="rounded-lg border border-slate-800 p-8 text-center">
          <p className="text-sales-slate-400">No tienes acceso a la gestión de usuarios.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 placeholder-sales-slate-400 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-sales-slate-100 focus:outline-none focus:ring-2 focus:ring-sales-coral/50"
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Admin</option>
              <option value="COORDINATOR">Coordinador</option>
              <option value="VENDOR">Vendedor</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-sales-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium">Rol</th>
                  <th className="px-4 py-3 text-left font-medium">Grupo(s)</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sales-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sales-slate-400">
                      No hay usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="text-sales-slate-300 hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-sales-slate-100">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[u.role] || ''}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.groups && u.groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.groups.map((g) => (
                              <span key={g.id} className="inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs text-sales-slate-300">
                                {g.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sales-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block h-2 w-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-slate-700 hover:text-sales-slate-200 transition-colors"
                            title="Editar usuario"
                          >
                            <Pencil size={16} />
                          </button>
                          {u.isActive && u.role !== 'ADMIN' && (
                            <button
                              onClick={() => setDeactivatingUser(u)}
                              className="rounded-lg p-1.5 text-sales-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Borrar usuario"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta.total > meta.limit && (
            <div className="mt-4 flex items-center justify-between text-sm text-sales-slate-400">
              <span>{meta.total} usuarios en total</span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadUsers(Math.max(1, meta.page - 1))}
                  disabled={meta.page <= 1}
                  className="rounded px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => loadUsers(meta.page + 1)}
                  disabled={meta.page * meta.limit >= meta.total}
                  className="rounded px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deactivatingUser && (
        <ConfirmDeactivateModal
          user={deactivatingUser}
          onClose={() => setDeactivatingUser(null)}
          onSaved={() => {
            setDeactivatingUser(null);
            loadUsers(meta.page);
            loadTenantProfile();
          }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={refreshAfterEdit}
        />
      )}
    </div>
  );
}
