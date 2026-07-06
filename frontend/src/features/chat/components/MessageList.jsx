import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * SecureMedia - Fetches and renders media using Bearer token without exposing it in URLs
 */
const SecureMedia = ({ url, type, alt, className }) => {
  const token = useAuthStore(state => state.token);
  const [src, setSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;
    
    fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => {
      if (!r.ok) {
        if (r.status === 401) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
        throw new Error('Network error');
      }
      return r.blob();
    })
    .then(blob => {
      objectUrl = URL.createObjectURL(blob);
      if (isMounted) {
        setSrc(objectUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    })
    .catch(err => {
      console.error(err);
      if (isMounted) setHasError(true);
    });
    
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  if (hasError) return <div className="bg-sales-slate-800 border border-red-500/30 text-red-400 p-2 text-xs rounded flex flex-col items-center"><span>⚠️ Error</span><span>al cargar</span></div>;
  if (!src) return <div className="animate-pulse bg-sales-slate-700 h-20 w-32 rounded-md flex items-center justify-center text-xs text-sales-slate-400">Cargando...</div>;

  if (type === 'IMAGE') {
    return <img src={src} alt={alt} className={`${className} max-h-64 object-contain`} onError={(e) => { e.target.onerror = null; e.target.src = '/assets/fallback-image.png'; }} />;
  }
  if (type === 'VIDEO') {
    return <video src={src} controls className={`${className} max-h-64`} />;
  }
  if (type === 'AUDIO') {
    return <audio src={src} controls className="w-full" />;
  }
  return <a href={src} target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-1">📎 Archivo adjunto</a>;
};

/**
 * MessageList - Muestra y envía mensajes de una conversación seleccionada
 * 
 * @component
 */
export default function MessageList({ messages, onSendMessage, onSendMedia, isUploading, errorMsg, clearError, clientName, hasMore, loadMoreMessages, isLoadingMore, headerActions }) {
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const abortControllerRef = useRef(null);
  
  const scrollContainerRef = useRef(null);
  const observerTargetRef = useRef(null);
  const highlightedRef = useRef(null);
  
  const previousScrollHeight = useRef(null);
  const scrollPositionRestored = useRef(true);

  const { highlightedMessageId, setHighlightedMessageId, addTag, removeTag } = useChatStore();
  const [addingTagTo, setAddingTagTo] = useState(null);
  const [tagInput, setTagInput] = useState('');

  // Global drag prevention
  useEffect(() => {
    const preventGlobal = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', preventGlobal);
    window.addEventListener('drop', preventGlobal);
    return () => {
      window.removeEventListener('dragover', preventGlobal);
      window.removeEventListener('drop', preventGlobal);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Scroll to bottom on new message if we didn't just load older messages
  const prevMessagesLength = useRef(messages.length);
  const prevFirstMessageId = useRef(messages.length > 0 ? messages[0].id : null);

  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessageAtEnd = messages.length > prevMessagesLength.current && messages[0].id === prevFirstMessageId.current;
      const isFirstLoad = prevMessagesLength.current === 0;
      
      let isNearBottom = true;
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      }
      
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage && (lastMessage.senderType === 'VENDOR' || lastMessage.senderType === 'SYSTEM');
      
      if ((isFirstLoad || (isNewMessageAtEnd && (isNearBottom || isMyMessage))) && scrollPositionRestored.current && !highlightedMessageId) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      
      prevMessagesLength.current = messages.length;
      prevFirstMessageId.current = messages[0].id;
    }
  }, [messages, highlightedMessageId]);

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Clear highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId, messages, setHighlightedMessageId]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          if (scrollContainerRef.current && messages.length > 0) {
            previousScrollHeight.current = scrollContainerRef.current.scrollHeight;
            scrollPositionRestored.current = false;
          }
          if (loadMoreMessages) loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTargetRef.current) observer.observe(observerTargetRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreMessages, messages]);

  // Adjust scroll after loading more
  useLayoutEffect(() => {
    if (!scrollPositionRestored.current && scrollContainerRef.current && previousScrollHeight.current) {
      if (messages.length > 0 && prevFirstMessageId.current && messages[0].id !== prevFirstMessageId.current) {
        const newScrollHeight = scrollContainerRef.current.scrollHeight;
        const heightDifference = newScrollHeight - previousScrollHeight.current;
        scrollContainerRef.current.scrollTop += heightDifference;
        scrollPositionRestored.current = true;
      }
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedFile) {
      if (onSendMedia) {
        try {
          abortControllerRef.current = new AbortController();
          await onSendMedia(selectedFile, text.trim(), isInternal, abortControllerRef.current.signal);
          setSelectedFile(null);
          setText('');
          setLocalError(null);
          setIsInternal(false);
        } catch (error) {
          setLocalError(error.message || 'Error al enviar archivo.');
        }
      } else {
        setSelectedFile(null);
        setText('');
      }
    } else if (text.trim()) {
      try {
        await onSendMessage(text.trim(), isInternal);
        setText('');
        setIsInternal(false);
      } catch (error) {
        // Handle error if thrown
      }
    }
  };

  const handleAddTag = async (e, msgId) => {
    e.preventDefault();
    if (tagInput.trim()) {
      await addTag(msgId, tagInput.trim());
    }
    setAddingTagTo(null);
    setTagInput('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4', 'video/3gpp', 'video/quicktime',
        'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'
      ];
      // Fallback allowed checks (some OS/Browsers map extensions without standard mime types properly, so we don't strict block empty types, but we block known mismatched types)
      if (file.type && !allowedMimeTypes.includes(file.type)) {
        setLocalError('Tipo de archivo no permitido.');
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      
      if (file.size > 15 * 1024 * 1024) {
        setLocalError('El archivo supera el límite de 15MB.');
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      
      setLocalError(null);
      setSelectedFile(file);
      if (e.target && e.target.value !== undefined) {
        e.target.value = null; // reset if from input
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        setLocalError('Solo puedes enviar un archivo a la vez.');
        return;
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = null; // Reset native input just in case
      }
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div 
      className={`flex flex-col h-full bg-sales-slate-900 border-l border-sales-slate-800 relative ${isDragging ? 'ring-2 ring-sales-cyan-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading && (
        <div className="absolute inset-0 bg-sales-slate-900/60 z-40 flex items-center justify-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sales-cyan-400"></div>
        </div>
      )}
      
      {isDragging && !isUploading && (
        <div className="absolute inset-0 bg-sales-slate-900/80 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="text-sales-cyan-400 flex flex-col items-center">
            <span className="text-6xl mb-4">📥</span>
            <span className="text-xl font-bold">Suelta el archivo aquí para enviar</span>
          </div>
        </div>
      )}
      
      {/* Chat Header */}
      <div className="p-4 border-b border-sales-slate-800 bg-sales-slate-900 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sales-slate-100">{clientName || 'Conversación Activa'}</h2>
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div ref={observerTargetRef} className="h-4 w-full"></div>
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sales-cyan-400"></div>
          </div>
        )}
        {(errorMsg || localError) && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex justify-between items-center mb-4">
            <span className="text-sm font-medium">{errorMsg || localError}</span>
            <button onClick={() => { if(clearError) clearError(); setLocalError(null); }} className="text-red-400 hover:text-red-300 font-bold px-2">&times;</button>
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="text-center text-sales-slate-500 mt-10">Envía un mensaje para comenzar a chatear.</div>
        )}
        
        {useMemo(() => messages.map((msg) => {
          const isMyTeam = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN'].includes(msg.senderType);
          const isHighlighted = msg.id === highlightedMessageId;
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMyTeam ? 'justify-end' : 'justify-start'} transition-all duration-1000 ${isHighlighted ? 'ring-4 ring-sales-cyan-500 rounded-lg bg-sales-cyan-500/20 p-2' : ''}`}
              ref={isHighlighted ? highlightedRef : null}
            >
              <div 
                className={`group max-w-[70%] rounded-lg p-3 shadow-sm ${
                  isMyTeam 
                    ? msg.isInternal
                      ? 'bg-sales-orange-500/20 text-sales-orange-100 rounded-br-none border-l-4 border-sales-orange-500 backdrop-blur-md'
                      : ['COORDINATOR', 'ADMIN'].includes(msg.senderType)
                        ? 'bg-sales-coral-600/90 text-white rounded-br-none border-r-4 border-sales-coral-400 backdrop-blur-md shadow-md'
                        : 'bg-sales-cyan-600 text-white rounded-br-none' 
                    : 'bg-sales-slate-800 text-sales-slate-200 rounded-bl-none'
                }`}
              >
                {msg.isInternal && (
                  <div className="text-[10px] uppercase font-bold text-sales-orange-400 mb-1 flex items-center gap-1">
                    <span>🔒</span> Comentario Interno
                  </div>
                )}
                {!msg.isInternal && ['COORDINATOR', 'ADMIN'].includes(msg.senderType) && (
                  <div className="text-[10px] uppercase font-bold text-sales-coral-200 mb-1 flex items-center gap-1">
                    <span>🛡️</span> Intervención de Coordinador
                  </div>
                )}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2">
                    <SecureMedia 
                      url={msg.attachments[0].url} 
                      type={msg.attachments[0].type} 
                      alt="Attachment" 
                      className="max-w-full rounded-md" 
                    />
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <span className="text-[10px] opacity-70 mt-1 block text-right">
                  {(() => {
                    const d = new Date(msg.createdAt);
                    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  })()}
                </span>
                
                {/* Tags Section */}
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  {(msg.tags || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sales-slate-700/50 text-sales-slate-200 border border-sales-slate-600/50">
                      {t}
                      <button onClick={() => removeTag(msg.id, t)} className="text-sales-slate-400 hover:text-red-400 focus:outline-none" title="Remove tag">&times;</button>
                    </span>
                  ))}
                  
                  {addingTagTo === msg.id ? (
                    <form onSubmit={(e) => handleAddTag(e, msg.id)} className="inline-flex items-center">
                      <input 
                        type="text" 
                        autoFocus
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onBlur={() => setAddingTagTo(null)}
                        placeholder="Tag..."
                        className="px-2 py-0.5 rounded text-xs bg-sales-slate-800 border border-sales-cyan-500 text-white focus:outline-none w-20"
                      />
                    </form>
                  ) : (
                    <button 
                      onClick={() => { setAddingTagTo(msg.id); setTagInput(''); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-5 h-5 rounded-full bg-sales-slate-700/50 hover:bg-sales-cyan-500/50 text-sales-slate-300 text-xs"
                      title="Add tag"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }), [messages, highlightedMessageId, addingTagTo, tagInput])}
        <div ref={bottomRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="p-3 bg-sales-slate-800 border-t border-sales-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-sales-cyan-400">
            <span>📎</span>
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <span className="text-sales-slate-500 text-xs">({formatBytes(selectedFile.size)})</span>
          </div>
          <button 
            onClick={() => setSelectedFile(null)} 
            className="text-sales-slate-400 hover:text-red-400 text-lg font-bold"
            disabled={isUploading}
            type="button"
          >
            &times;
          </button>
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-sales-slate-800 bg-sales-slate-900">
        <form onSubmit={handleSend} className="flex gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-sales-slate-400 hover:text-sales-cyan-400 disabled:opacity-50 transition-colors"
            title="Adjuntar archivo"
          >
            {isUploading ? '⏳' : '📎'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading}
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          {user && ['ADMIN', 'COORDINATOR', 'VENDOR'].includes(user.role) && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setIsInternal(!isInternal)}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors font-bold text-xs ${
                isInternal 
                  ? 'bg-sales-orange-500 text-white hover:bg-sales-orange-600' 
                  : 'bg-sales-slate-800 text-sales-slate-400 hover:text-sales-slate-200 border border-sales-slate-700'
              }`}
              title={isInternal ? "Comentario Interno" : "Respuesta al Cliente"}
            >
              {isInternal ? '🔒 Interno' : '💬 Cliente'}
            </button>
          )}
          <input 
            type="text"
            className="flex-1 bg-sales-slate-800 border border-sales-slate-700 rounded-lg px-4 py-2 text-sales-slate-200 focus:outline-none focus:border-sales-cyan-400"
            placeholder={isUploading ? "Enviando..." : (selectedFile ? "Añadir un comentario..." : (isInternal ? "Escribe un comentario interno..." : "Escribe un mensaje al cliente..."))}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isUploading}
          />
          <button 
            type="submit" 
            disabled={(!text.trim() && !selectedFile) || isUploading}
            className="bg-sales-cyan-500 hover:bg-sales-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
