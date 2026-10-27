import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { get, post } from '../../../services/api';
import { Eyebrow, Kbd, Spinner } from '../../../components/ui/index.js';
import { cn } from '../../../utils/cn.js';

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
    const term = (filterText || '').toLowerCase();
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
    } catch {
      /* usage tracking is best-effort */
    }
    onSelect(r.content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="listbox"
      className="absolute bottom-full left-0 z-50 mb-2 flex max-h-72 w-96 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <Zap size={11} className="text-accent" aria-hidden />
          <Eyebrow>Respuestas rápidas</Eyebrow>
        </span>
        <span className="flex items-center gap-1 text-[10px] text-fg-subtle"><Kbd>↑↓</Kbd><Kbd>↵</Kbd></span>
      </div>

      {loading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-5 text-center text-sm text-fg-subtle">Sin coincidencias{filterText ? ` para "${filterText}"` : ''}</div>
      ) : (
        <ul className="overflow-y-auto py-1 custom-scrollbar">
          {filteredResponses.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn('cursor-pointer border-l-2 px-3 py-2 transition-colors', i === selectedIndex ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2/60')}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-fg">{r.title}</span>
                {r.shortcut && <span className="shrink-0 font-mono text-[10px] text-fg-subtle">/{r.shortcut}</span>}
              </div>
              <div className="mt-0.5 truncate text-xs text-fg-muted">{r.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
