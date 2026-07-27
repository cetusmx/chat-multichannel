import { useState, useEffect } from 'react';
import { get, post, put, del } from '../../services/api';

export default function CannedResponsesSection() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');

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
    if (!confirm('¿Seguro que deseas eliminar esta respuesta rápida?')) return;
    try {
      const res = await del(`/canned-responses/${id}`);
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchResponses();
    } catch (err) {
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

  if (loading && responses.length === 0) return <div className="text-sales-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Respuestas Rápidas</h2>
        <p className="text-sm text-sales-slate-400">
          Configura plantillas de mensajes (ej. datos bancarios, saludos) que los vendedores podrán insertar fácilmente usando el comando <code className="bg-sales-slate-800 px-1 py-0.5 rounded text-sales-cyan-400">/</code> en el chat.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-sales-slate-800 p-4 rounded-xl border border-sales-slate-700 space-y-4">
          <h3 className="text-white font-medium">{currentId ? 'Editar Respuesta' : 'Nueva Respuesta'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-sales-slate-400 mb-1">Título / Nombre *</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Datos Bancarios"
                className="w-full bg-sales-slate-900 border border-sales-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-sales-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sales-slate-400 mb-1">Atajo (Opcional)</label>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="Ej. /banco"
                className="w-full bg-sales-slate-900 border border-sales-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-sales-cyan-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-sales-slate-400 mb-1">Contenido del mensaje *</label>
            <textarea
              required
              rows="4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="El texto exacto que se insertará en el chat..."
              className="w-full bg-sales-slate-900 border border-sales-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-sales-cyan-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-sales-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sales-cyan-600 hover:bg-sales-cyan-500 text-white rounded-lg text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-sales-cyan-600 hover:bg-sales-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <span>+</span> Nueva Respuesta
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {responses.map((r) => (
          <div key={r.id} className="bg-sales-slate-800 p-4 rounded-xl border border-sales-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-medium">{r.title}</h4>
                {r.shortcut && (
                  <span className="text-xs bg-sales-slate-700 text-sales-cyan-400 px-2 py-0.5 rounded">{r.shortcut}</span>
                )}
              </div>
              <p className="text-sm text-sales-slate-400 line-clamp-3 whitespace-pre-wrap">{r.content}</p>
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-sales-slate-700/50">
              <button onClick={() => handleEdit(r)} className="text-sales-slate-400 hover:text-white text-sm">Editar</button>
              <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
            </div>
          </div>
        ))}
        {responses.length === 0 && !isEditing && (
          <div className="col-span-full text-center text-sales-slate-500 py-8">
            No hay respuestas rápidas configuradas.
          </div>
        )}
      </div>
    </div>
  );
}
