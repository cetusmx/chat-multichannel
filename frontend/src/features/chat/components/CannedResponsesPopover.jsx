import { useState, useEffect, useRef } from 'react';
import { get, post } from '../../services/api';

export default function CannedResponsesPopover({ isOpen, onClose, onSelect, filterText, anchorEl }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchResponses();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await get('/canned-responses/my-usage');
      if (res.ok) {
        const data = await res.json();
        setResponses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching canned responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = responses.filter(r => {
    const term = filterText.toLowerCase();
    return (
      r.title.toLowerCase().includes(term) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(term))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(s => Math.min(s + 1, filteredResponses.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredResponses[selectedIndex];
        if (selected) {
          await handleSelect(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResponses, selectedIndex, onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && anchorEl && !anchorEl.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, anchorEl, onClose]);

  const handleSelect = async (r) => {
    try {
      await post(`/canned-responses/${r.id}/use`);
    } catch (e) {
      // ignore
    }
    onSelect(r.content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-sales-slate-800 border border-sales-slate-700 rounded-lg shadow-xl z-50 flex flex-col"
    >
      <div className="p-2 border-b border-sales-slate-700 bg-sales-slate-900 sticky top-0">
        <span className="text-xs font-semibold text-sales-cyan-400">⚡ Respuestas Rápidas</span>
      </div>
      
      {loading ? (
        <div className="p-4 text-center text-sales-slate-500 text-sm">Cargando...</div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-4 text-center text-sales-slate-500 text-sm">No se encontraron respuestas</div>
      ) : (
        <ul className="py-1">
          {filteredResponses.map((r, i) => (
            <li 
              key={r.id}
              onClick={() => handleSelect(r)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                i === selectedIndex ? 'bg-sales-cyan-600/30 border-l-2 border-sales-cyan-500' : 'hover:bg-sales-slate-700 border-l-2 border-transparent'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-white text-sm">{r.title}</span>
                {r.shortcut && <span className="text-[10px] text-sales-cyan-300 bg-sales-cyan-900/50 px-1.5 py-0.5 rounded">{r.shortcut}</span>}
              </div>
              <div className="text-xs text-sales-slate-400 truncate">{r.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
