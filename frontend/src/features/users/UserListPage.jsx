import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Search, Plus, Users, ShieldOff } from 'lucide-react';
import { get, put } from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { toast } from '../../stores/useToastStore.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import {
  Badge,
  Button,
  EmptyState,
  Eyebrow,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Switch,
} from '../../components/ui/index.js';

const ROLE_TONES = { ADMIN: 'accent', COORDINATOR: 'info', VENDOR: 'neutral' };

function ConfirmDeactivateModal({ user, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const payload = { isActive: false };
      const res = await put(`/users/${user.id}`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al borrar usuario');
      }
      toast.success('Usuario desactivado', { description: user.name });
      onSaved();
      onClose();
    } catch (err) {
      toast.error('No se pudo desactivar el usuario', { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmModal
      open
      title="Desactivar usuario"
      message={`¿Seguro que deseas desactivar a ${user.name}? Dejará de tener acceso a la plataforma.`}
      confirmText="Desactivar"
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '', password: '' });
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
      if (form.password) {
        payload.password = form.password;
      }
      if (user.role !== 'ADMIN') {
        payload.groupIds = groupIds;
      }
      const res = await put(`/users/${user.id}`, payload);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Error al actualizar');
      }
      toast.success('Usuario actualizado');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Usuarios"
      title="Editar usuario"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" form="edit-user-form" loading={loading}>Guardar</Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <Badge tone={ROLE_TONES[role] || 'neutral'}>{ROLE_LABELS[role] || role}</Badge>
        {role === 'COORDINATOR' && (
          <span className="text-xs text-fg-muted">
            {vendorCount} vendedor{vendorCount !== 1 ? 'es' : ''} asignado{vendorCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            {(a) => <Input {...a} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
          </Field>
          <Field label="Correo" required>
            {(a) => <Input {...a} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
          </Field>
          <Field label="Teléfono">
            {(a) => <Input {...a} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
          </Field>
          <Field label="Contraseña" hint="Déjala en blanco para no cambiarla">
            {(a) => (
              <Input
                {...a}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
              />
            )}
          </Field>
        </div>

        <Switch checked={isActive} onChange={setIsActive} label="Usuario activo" />

        {user.role !== 'ADMIN' && allGroups.length > 0 && (
          <Field
            label={user.role === 'VENDOR' ? 'Grupo' : 'Grupos'}
            hint={user.role === 'VENDOR' ? 'El coordinador se asigna automáticamente según el grupo seleccionado.' : undefined}
          >
            {(a) =>
              user.role === 'VENDOR' ? (
                <Select {...a} value={groupIds[0] || ''} onChange={(e) => handleGroupChange(e.target.value)}>
                  <option value="">Seleccionar grupo</option>
                  {allGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((g) => (
                    <Button
                      key={g.id}
                      size="sm"
                      variant={groupIds.includes(g.id) ? 'chip-accent' : 'chip'}
                      onClick={() => handleGroupChange(g.id)}
                      aria-pressed={groupIds.includes(g.id)}
                    >
                      {g.name}
                    </Button>
                  ))}
                </div>
              )
            }
          </Field>
        )}
      </form>
    </Modal>
  );
}

function SkeletonRows({ rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-b border-border/70">
      <td colSpan={7} className="px-4 py-3">
        <div className="h-5 animate-pulse rounded-md bg-surface-2" />
      </td>
    </tr>
  ));
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
  const navigate = useNavigate();

  async function loadTenantProfile() {
    try {
      const res = await get('/tenant/profile');
      if (res.ok) {
        const body = await res.json();
        setTenantProfile(body.data);
      }
    } catch {
      /* silent */
    }
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
    } catch {
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

  const hasSeatLimit = tenantProfile && tenantProfile.maxUsers !== -1;
  const seatsFull = hasSeatLimit && tenantProfile.currentUsersCount >= tenantProfile.maxUsers;
  const isVendor = user?.role === 'VENDOR';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Equipo"
        title="Usuarios"
        description="Administra las cuentas, roles y grupos de tu equipo."
        actions={
          !isVendor && (
            <>
              {hasSeatLimit && (
                <Badge tone={seatsFull ? 'warning' : 'neutral'}>
                  Asientos {tenantProfile.currentUsersCount}/{tenantProfile.maxUsers}
                </Badge>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                disabled={!!seatsFull}
                title={seatsFull ? 'Límite de asientos alcanzado' : undefined}
                onClick={() => navigate('/users/new')}
              >
                Nuevo usuario
              </Button>
            </>
          )
        }
      />

      {isVendor ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={ShieldOff} title="Sin acceso" description="No tienes acceso a la gestión de usuarios." />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                leftIcon={Search}
                placeholder="Buscar por nombre o correo"
                aria-label="Buscar usuarios"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              />
            </div>
            <div className="sm:w-52">
              <Select aria-label="Filtrar por rol" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Todos los roles</option>
                <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                <option value="COORDINATOR">{ROLE_LABELS.COORDINATOR}</option>
                <option value="VENDOR">{ROLE_LABELS.VENDOR}</option>
              </Select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Nombre</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Correo</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Teléfono</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Rol</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Grupos</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Estado</Eyebrow></th>
                    <th className="border-b border-border px-4 py-2.5 text-right"><Eyebrow tone="muted">Acciones</Eyebrow></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          compact
                          icon={Users}
                          title="No hay usuarios"
                          description={search || role ? 'Ningún usuario coincide con la búsqueda.' : 'Aún no has creado usuarios en tu equipo.'}
                        />
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                        <td className="px-4 py-3 font-medium text-fg">{u.name}</td>
                        <td className="px-4 py-3 text-fg-muted">{u.email}</td>
                        <td className="tnum px-4 py-3 font-mono text-xs text-fg-muted">{u.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={ROLE_TONES[u.role] || 'neutral'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {u.groups && u.groups.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.groups.map((g) => (
                                <Badge key={g.id} tone="neutral">{g.name}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={u.isActive ? 'success' : 'neutral'} dot>{u.isActive ? 'Activo' : 'Inactivo'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton icon={Pencil} label="Editar usuario" size="sm" onClick={() => setEditingUser(u)} />
                            {u.isActive && u.role !== 'ADMIN' && (
                              <IconButton icon={Trash2} label="Desactivar usuario" size="sm" variant="danger" onClick={() => setDeactivatingUser(u)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {meta.total > meta.limit && (
            <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
              <span className="tnum">{meta.total} usuarios en total</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => loadUsers(Math.max(1, meta.page - 1))} disabled={meta.page <= 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadUsers(meta.page + 1)} disabled={meta.page * meta.limit >= meta.total}>
                  Siguiente
                </Button>
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
