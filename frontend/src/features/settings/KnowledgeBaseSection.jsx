import { useState, useEffect } from 'react';
import { uploadKnowledgeBaseDocument, getKnowledgeBaseDocuments } from '../../services/api';

export default function KnowledgeBaseSection() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await getKnowledgeBaseDocuments();
      setDocuments(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
  
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'READY':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">Listo</span>;
      case 'ERROR':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Error</span>;
      case 'PROCESSING':
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Procesando</span>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-sales-slate-900 p-6">
        <h2 className="mb-4 text-lg font-medium text-sales-slate-100">Base de Conocimiento (RAG)</h2>
        <p className="mb-6 text-sm text-sales-slate-400">
          Sube documentos PDF o CSV para entrenar a la inteligencia artificial con información específica de tu empresa.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="flex items-end gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="kb-file-upload" className="block text-sm font-medium text-sales-slate-300 mb-1">
              Seleccionar Documento (Max 5MB)
            </label>
            <input
              id="kb-file-upload"
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-sales-slate-300
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-medium
                file:bg-sales-blue-500/20 file:text-sales-blue-400
                hover:file:bg-sales-blue-500/30
                cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded bg-sales-coral px-4 py-2 font-medium text-white transition-colors hover:bg-sales-coral/90 disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-sales-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase text-sales-slate-400">
              <tr>
                <th className="px-4 py-3">Archivo</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-sales-slate-500">
                    Cargando documentos...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-sales-slate-500">
                    No hay documentos subidos a la base de conocimiento.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-sales-slate-200">
                      {doc.filename}
                    </td>
                    <td className="px-4 py-3">{formatSize(doc.size)}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="px-4 py-3">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
