import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Search, BookOpen } from 'lucide-react';
import { get, post, put, del } from '../../services/api';

const AiRulesSection = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  
  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    isActive: true
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
    if (!window.confirm('¿Eliminar esta regla permanentemente?')) return;
    try {
      await del(`/tenant/ai-rules/${id}`);
      fetchRules();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleToggle = async (rule) => {
    try {
      await put(`/tenant/ai-rules/${rule.id}`, {
        ...rule,
        isActive: !rule.isActive
      });
      fetchRules();
    } catch (err) {
      console.error(err);
      alert('Error al cambiar estado');
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
    r.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-sales-slate-800 rounded-xl p-6 shadow-sm border border-sales-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sales-cyan-500/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-sales-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Diccionario y Reglas de IA</h2>
            <p className="text-sales-slate-400 text-sm">Entrena a la IA con sinónimos, códigos de productos o reglas específicas de tu negocio.</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-sales-blue-600 hover:bg-sales-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Regla
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-sales-slate-900/50 p-6 rounded-lg border border-sales-slate-700 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">
            {currentRule ? 'Editar Regla' : 'Nueva Regla'}
          </h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sales-slate-300 mb-1">Término o Concepto</label>
              <input
                type="text"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                placeholder="ej. limpiador metálico"
                className="w-full bg-sales-slate-800 border border-sales-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-sales-cyan-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sales-slate-300 mb-1">Definición o Instrucción para la IA</label>
              <textarea
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                placeholder="ej. Buscar únicamente limpiadores con perfil H860 y H862"
                rows="3"
                className="w-full bg-sales-slate-800 border border-sales-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-sales-cyan-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded bg-sales-slate-700 border-sales-slate-600 text-sales-blue-500 focus:ring-sales-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-sales-slate-300">
                Regla Activa
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sales-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-sales-cyan-600 hover:bg-sales-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sales-slate-400" />
            <input
              type="text"
              placeholder="Buscar regla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-sales-slate-900 border border-sales-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-sales-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sales-slate-700 text-sales-slate-400 text-sm">
                  <th className="py-3 px-4 font-medium">Término</th>
                  <th className="py-3 px-4 font-medium">Definición</th>
                  <th className="py-3 px-4 font-medium text-center">Estado</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-sales-slate-400">Cargando...</td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-sales-slate-400">
                      No se encontraron reglas. Agrega una nueva.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map(rule => (
                    <tr key={rule.id} className="border-b border-sales-slate-700/50 hover:bg-sales-slate-700/20 transition-colors">
                      <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{rule.term}</td>
                      <td className="py-3 px-4 text-sales-slate-300">
                        <span className="line-clamp-2">{rule.definition}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggle(rule)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            rule.isActive 
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                              : 'bg-sales-slate-700 text-sales-slate-400 hover:bg-sales-slate-600'
                          }`}
                        >
                          {rule.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button 
                          onClick={() => handleEdit(rule)}
                          className="p-2 text-sales-slate-400 hover:text-sales-cyan-400 transition-colors inline-block"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 text-sales-slate-400 hover:text-red-400 transition-colors inline-block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AiRulesSection;
