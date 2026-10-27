import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Users } from 'lucide-react';
import { get, post, put, del } from '../../services/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Modal, Field, Input, Select, Button, IconButton, EmptyState, Eyebrow, Spinner } from '../../components/ui/index.js';

function ErrorAlert({ children, className = '' }) {
  return (
    <div role="alert" className={`rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger ${className}`}>
      {children}
    </div>
  );
}

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
    <Modal
      open
      onClose={onCancel}
      eyebrow="Grupo"
      title={group ? 'Editar grupo' : 'Nuevo grupo'}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="group-form" variant="primary" loading={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Field label="Nombre" required>
          {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-autofocus />}
        </Field>
        <Field label="Descripción">
          {(p) => <Input {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <Field label="Sucursal" required>
          {(p) => (
            <Select {...p} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
              <option value="">Seleccionar sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
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

  const newButton = (
    <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingGroup(null); setShowForm(true); }}>
      Nuevo grupo
    </Button>
  );

  return (
    <Panel
      eyebrow="Organización"
      title="Grupos"
      description="Equipos de venta con su coordinador y vendedores asignados."
      actions={newButton}
      padded={false}
    >
      {error && <ErrorAlert className="m-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={20} />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title="Sin grupos"
          description="Crea un grupo para agrupar vendedores bajo un coordinador."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Nombre</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Descripción</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Sucursal</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Coordinador</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-right"><Eyebrow tone="muted">Vendedores</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium text-fg">{g.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{g.description || '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{g.branch?.name || '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{g.coordinator?.name || '—'}</td>
                  <td className="tnum px-4 py-3 text-right font-mono text-fg-muted">{g.vendorCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Pencil} label="Editar grupo" size="sm" onClick={() => { setEditingGroup(g); setShowForm(true); }} />
                      <IconButton icon={Trash2} label="Eliminar grupo" size="sm" variant="danger" onClick={() => setConfirmDelete(g)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteError && <ErrorAlert className="m-5">{deleteError}</ErrorAlert>}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar grupo"
        message={`¿Eliminar el grupo "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
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
    </Panel>
  );
}
