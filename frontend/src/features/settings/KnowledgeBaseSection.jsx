import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import { uploadKnowledgeBaseDocument, getKnowledgeBaseDocuments, deleteKnowledgeBaseDocument } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Button, IconButton, Badge, EmptyState, Eyebrow, Spinner } from '../../components/ui/index.js';

const STATUS_META = {
  READY: { tone: 'success', label: 'Listo' },
  ERROR: { tone: 'danger', label: 'Error' },
  PROCESSING: { tone: 'warning', label: 'Procesando' },
};

export default function KnowledgeBaseSection() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchDocuments();

    // Poll every 3 seconds if there are processing documents
    const intervalId = window.setInterval(() => {
      setDocuments(currentDocs => {
        if (currentDocs.some(doc => doc.status === 'PROCESSING')) {
          fetchDocuments(true);
        }
        return currentDocs;
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  const fetchDocuments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getKnowledgeBaseDocuments();
      setDocuments(res.data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return; // User cancelled dialog

    if (selected.type === 'application/pdf' || selected.type === 'text/csv' || selected.name.endsWith('.csv')) {
      setFile(selected);
      setError('');
    } else {
      setFile(null);
      setError('Por favor, selecciona un archivo PDF o CSV.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      await uploadKnowledgeBaseDocument(file);

      setFile(null);
      // Reset input
      const fileInput = document.getElementById('kb-file-upload');
      if (fileInput) fileInput.value = '';

      // Fetch documents again to show the new one
      await fetchDocuments();

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      setLoading(true);
      setError('');
      await deleteKnowledgeBaseDocument(id);
      setConfirmDelete(null);
      await fetchDocuments();
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const meta = STATUS_META[status] || STATUS_META.PROCESSING;
    return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Asistente IA"
        title="Base de conocimiento"
        description="Documentos PDF o CSV con información de tu empresa que el asistente usa para responder."
      >
        {error && (
          <div role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label
            htmlFor="kb-file-upload"
            className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-2 px-3 text-sm transition-colors hover:border-accent"
          >
            <FileText size={15} className="shrink-0 text-fg-subtle" aria-hidden />
            <span className={file ? 'truncate text-fg' : 'truncate text-fg-subtle'}>
              {file ? file.name : 'Seleccionar documento PDF o CSV (máx. 5 MB)'}
            </span>
          </label>
          <input
            id="kb-file-upload"
            type="file"
            accept=".pdf,.csv,application/pdf,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />
          <Button type="submit" variant="primary" icon={Upload} loading={uploading} disabled={!file}>
            {uploading ? 'Subiendo…' : 'Subir documento'}
          </Button>
        </form>
      </Panel>

      <Panel eyebrow="Documentos" title="Archivos cargados" padded={false}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={20} />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="Sin documentos"
            description="Sube catálogos, listas de precios o políticas para que el asistente los consulte."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Archivo</Eyebrow></th>
                  <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Tamaño</Eyebrow></th>
                  <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Estado</Eyebrow></th>
                  <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Fecha</Eyebrow></th>
                  <th className="border-b border-border px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-3 font-medium text-fg">{doc.filename}</td>
                    <td className="tnum px-4 py-3 font-mono text-[13px] text-fg-muted">{formatSize(doc.size)}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="tnum px-4 py-3 font-mono text-[13px] text-fg-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <IconButton icon={Trash2} label="Eliminar documento" size="sm" variant="danger" onClick={() => setConfirmDelete(doc)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar documento"
        message={`¿Eliminar el documento "${confirmDelete?.filename}"? Esta acción no se puede deshacer.`}
        onConfirm={() => executeDelete(confirmDelete?.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
