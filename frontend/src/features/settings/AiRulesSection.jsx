import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import { get, post, put, del } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Modal, Field, Input, Textarea, Switch, Button, IconButton, EmptyState, Eyebrow, Spinner } from '../../components/ui/index.js';
import { toast } from '../../stores/useToastStore.js';

const AiRulesSection = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');

  const fetchRules = async () => {
    try {
      const res = await get('/tenant/ai-rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching ai rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAdd = () => {
    setFormData({ term: '', definition: '', isActive: true });
    setCurrentRule(null);
    setFormError('');
    setIsEditing(true);
  };

  const handleEdit = (rule) => {
    setFormData({ term: rule.term, definition: rule.definition, isActive: rule.isActive });
    setCurrentRule(rule);
    setFormError('');
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    try {
      await del(`/tenant/ai-rules/${id}`);
      setConfirmDelete(null);
      fetchRules();
    } catch (err) {
      console.error(err);
      setConfirmDelete(null);
      toast.error('No se pudo eliminar la regla');
    }
  };

  const handleToggle = async (rule) => {
    try {
      await put(`/tenant/ai-rules/${rule.id}`, {
        ...rule,
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar el estado de la regla');
    }
  };

  const handleSave = async () => {
    if (!formData.term.trim() || !formData.definition.trim()) {
      setFormError('Término y definición son requeridos');
      return;
    }

    try {
      let res;
      if (currentRule) {
        res = await put(`/tenant/ai-rules/${currentRule.id}`, formData);
      } else {
        res = await post('/tenant/ai-rules', formData);
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar la regla');
      }

      setIsEditing(false);
      fetchRules();
    } catch (err) {
      setFormError(err.message || 'Error al guardar la regla');
    }
  };

  const filteredRules = rules.filter(r =>
    r.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.definition.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Panel
      eyebrow="Asistente IA"
      title="Diccionario y reglas"
      description="Sinónimos, códigos de producto e instrucciones específicas de tu negocio para el asistente."
      actions={
        <Button variant="secondary" size="sm" icon={Plus} onClick={handleAdd}>
          Nueva regla
        </Button>
      }
      padded={false}
    >
      <div className="border-b border-border px-5 py-3">
        <Input
          size="sm"
          leftIcon={Search}
          placeholder="Buscar regla…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar regla"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={20} />
        </div>
      ) : filteredRules.length === 0 ? (
        <EmptyState
          compact
          icon={BookOpen}
          title={searchTerm ? 'Sin resultados' : 'Sin reglas'}
          description={searchTerm ? 'Ninguna regla coincide con la búsqueda.' : 'Agrega términos o instrucciones para afinar las respuestas del asistente.'}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Término</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Definición</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Activa</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(rule => (
                <tr key={rule.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-fg">{rule.term}</td>
                  <td className="px-4 py-3 text-fg-muted">
                    <span className="line-clamp-2">{rule.definition}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={rule.isActive} onChange={() => handleToggle(rule)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Pencil} label="Editar regla" size="sm" onClick={() => handleEdit(rule)} />
                      <IconButton icon={Trash2} label="Eliminar regla" size="sm" variant="danger" onClick={() => setConfirmDelete(rule)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        eyebrow="Regla del asistente"
        title={currentRule ? 'Editar regla' : 'Nueva regla'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              {formError}
            </div>
          )}
          <Field label="Término o concepto" required>
            {(p) => (
              <Input
                {...p}
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                placeholder="Ej. limpiador metálico"
                data-autofocus
              />
            )}
          </Field>
          <Field label="Definición o instrucción" required>
            {(p) => (
              <Textarea
                {...p}
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                placeholder="Ej. Buscar únicamente limpiadores con perfil H860 y H862"
                rows={3}
              />
            )}
          </Field>
          <Switch
            checked={formData.isActive}
            onChange={(checked) => setFormData({ ...formData, isActive: checked })}
            label="Regla activa"
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar regla"
        message={`¿Eliminar la regla "${confirmDelete?.term}" permanentemente?`}
        onConfirm={() => handleDelete(confirmDelete?.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Panel>
  );
};

export default AiRulesSection;
