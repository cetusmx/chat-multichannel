import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, AlertTriangle } from 'lucide-react';
import useChatStore from '../../../stores/useChatStore';
import { Eyebrow, Kbd, Spinner } from '../../../components/ui/index.js';
import { formatDate } from '../../../utils/formatDate.js';
import { renderWhatsAppText, stripMediaPrefix } from '../../../utils/whatsappFormat.jsx';
import { cn } from '../../../utils/cn.js';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { searchMessages, searchResults, isSearching, searchError, clearSearchResults, selectConversation, setHighlightedMessageId } = useChatStore();
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleResultClick = (result) => {
    selectConversation(result.conversationId, result.id);
    setHighlightedMessageId(result.id);
    setIsOpen(false);
  };

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, query]);

  // Toggle with Cmd+K or Ctrl+K and handle navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
        return;
      }

      if (searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleResultClick(searchResults[selectedIndex]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else if (!isOpen) {
      setQuery('');
      clearSearchResults();
    }
  }, [isOpen, clearSearchResults]);

  useEffect(() => {
    if (!isOpen) return;

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.trim().length === 0) {
      clearSearchResults();
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      searchMessages(query, controller.signal);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, isOpen, searchMessages, clearSearchResults]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[18vh]"
      onClick={() => setIsOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en el historial de chats"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="shrink-0 text-fg-subtle" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            className="h-9 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle focus:outline-none"
            placeholder="Buscar en el historial de chats"
            aria-label="Buscar en el historial de chats"
            aria-controls="command-palette-results"
            aria-expanded={searchResults.length > 0}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Kbd>ESC</Kbd>
        </div>

        {query && (
          <div id="command-palette-results" className="max-h-96 overflow-y-auto custom-scrollbar">
            {isSearching && searchResults.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted">
                <Spinner />
                Buscando
              </div>
            )}

            {searchError && (
              <div className="m-3 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span>{searchError}</span>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && !searchError && (
              <div className="px-4 py-8 text-center text-sm text-fg-subtle">
                Sin resultados para “{query}”
              </div>
            )}

            {searchResults.length > 0 && (
              <ul role="listbox" className="py-1">
                {searchResults.map((msg, index) => (
                  <li
                    key={msg.id}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      'cursor-pointer border-l-2 px-4 py-2.5 transition-colors',
                      index === selectedIndex ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2/60',
                    )}
                    onClick={() => handleResultClick(msg)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <MessageSquare size={12} className="shrink-0 text-fg-subtle" aria-hidden />
                      <Eyebrow tone="muted">{msg.senderType === 'CLIENT' ? 'Cliente' : 'Asesor'}</Eyebrow>
                      <span className="tnum font-mono text-[10px] text-fg-subtle">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-fg">{renderWhatsAppText(stripMediaPrefix(msg.content))}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="flex items-center gap-1.5 text-[10px] text-fg-subtle">
            <Kbd>↑↓</Kbd> navegar
            <Kbd className="ml-2">↵</Kbd> abrir
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-fg-subtle">
            <Kbd>ESC</Kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
