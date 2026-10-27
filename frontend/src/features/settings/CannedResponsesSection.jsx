import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MessageSquareText } from 'lucide-react';
import { get, post, put, del } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Modal, Field, Input, Textarea, Button, IconButton, EmptyState, Kbd, Spinner } from '../../components/ui/index.js';

export default function CannedResponsesSection() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const res = await get('/canned-responses');
      if (!res.ok) throw new Error('Error fetching canned responses');
      const data = await res.json();
      setResponses(data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentId) {
        const res = await put(`/canned-responses/${currentId}`, { title, content, shortcut });
        if (!res.ok) throw new Error('Error actualizando respuesta');
      } else {
        const res = await post('/canned-responses', { title, content, shortcut });
        if (!res.ok) throw new Error('Error creando respuesta');
      }
      await fetchResponses();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (r) => {
    setCurrentId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setShortcut(r.shortcut || '');
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await del(`/canned-responses/${id}`);
      if (!res.ok) throw new Error('Error al eliminar');
      setConfirmDelete(null);
      await fetchResponses();
    } catch (err) {
      setConfirmDelete(null);
      setError(err.message);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitle('');
    setContent('');
    setShortcut('');
  };

  if (loading && responses.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <Panel
      eyebrow="Equipo"
      title="Respuestas rápidas"
      description={
        <>
          Plantillas de mensaje (datos bancarios, saludos…) que los vendedores insertan escribiendo <Kbd>/</Kbd> en el chat.
        </>
      }
      actions={
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsEditing(true)}>
          Nueva respuesta
        </Button>
      }
    >
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      {responses.length === 0 ? (
        <EmptyState
          compact
          icon={MessageSquareText}
          title="Sin respuestas rápidas"
          description="Crea plantillas para que el equipo responda más rápido y con el mismo tono."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {responses.map((r) => (
            <article key={r.id} className="flex flex-col rounded-lg border border-border bg-surface-2/40 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate text-sm font-semibold text-fg">{r.title}</h3>
                {r.shortcut && <Kbd className="shrink-0">{r.shortcut}</Kbd>}
              </div>
              <p className="line-clamp-3 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-fg-muted">{r.content}</p>
              <div className="mt-3 flex justify-end gap-1 border-t border-border/70 pt-3">
                <IconButton icon={Pencil} label="Editar respuesta" size="sm" onClick={() => handleEdit(r)} />
                <IconButton icon={Trash2} label="Eliminar respuesta" size="sm" variant="danger" onClick={() => setConfirmDelete(r)} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={isEditing}
        onClose={resetForm}
        eyebrow="Respuesta rápida"
        title={currentId ? 'Editar respuesta' : 'Nueva respuesta'}
        footer={
          <>
            <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
            <Button type="submit" form="canned-response-form" variant="primary">Guardar</Button>
          </>
        }
      >
        <form id="canned-response-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" required>
              {(p) => (
                <Input
                  {...p}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Datos bancarios"
                  data-autofocus
                />
              )}
            </Field>
            <Field label="Atajo" hint="Opcional. Ej. /banco">
              {(p) => (
                <Input
                  {...p}
                  mono
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="/banco"
                />
              )}
            </Field>
          </div>
          <Field label="Contenido del mensaje" required>
            {(p) => (
              <Textarea
                {...p}
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="El texto exacto que se insertará en el chat…"
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar respuesta rápida"
        message={`¿Eliminar la respuesta "${confirmDelete?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete?.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Panel>
  );
}
