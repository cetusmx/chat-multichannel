import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MessageSquare } from 'lucide-react';
import useChatStore from '../../../stores/useChatStore';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { searchMessages, searchResults, isSearching, searchError, clearSearchResults, selectConversation, setHighlightedMessageId } = useChatStore();
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  const handleResultClick = (result) => {
    selectConversation(result.conversationId, result.id);
    setHighlightedMessageId(result.id);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-lg"
            placeholder="Search in chat history..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">ESC</div>
        </div>

        {query && (
          <div className="max-h-96 overflow-y-auto">
            {isSearching && searchResults.length === 0 && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Searching...
              </div>
            )}
            
            {searchError && (
              <div className="px-4 py-3 text-red-500 bg-red-50">
                Error: {searchError}
              </div>
            )}

            {!isSearching && searchResults.length === 0 && !searchError && (
              <div className="px-4 py-8 text-center text-gray-500">
                No results found for "{query}"
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="py-2">
                {searchResults.map((msg, index) => (
                  <button
                    key={msg.id}
                    className={`w-full text-left px-4 py-3 focus:outline-none border-b border-gray-50 last:border-0 transition-colors ${index === selectedIndex ? 'bg-gray-100 ring-1 ring-sales-cyan-400' : 'hover:bg-gray-50'}`}
                    onClick={() => handleResultClick(msg)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {msg.senderType === 'CLIENT' ? 'Client' : 'Vendor'}
                        <span className="mx-2">•</span>
                        {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-gray-800 line-clamp-2 text-sm">{msg.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
