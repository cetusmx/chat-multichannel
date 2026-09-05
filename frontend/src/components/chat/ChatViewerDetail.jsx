import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';
import useAuthStore from '../../stores/useAuthStore';
import ContiguousSessionCard from './ContiguousSessionCard';
import SecureMedia from '../SecureMedia';

export default function ChatViewerDetail({ conversationId, targetMessageId, searchQuery, vendorName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const highlightText = (rawText, rawQuery) => {
    if (!rawQuery || !rawText) return String(rawText || '');
    try {
      const text = String(rawText);
      const query = String(rawQuery);
      // Split query by spaces to highlight individual words (mimicking full-text search)
      const tokens = query.split(/[\s*]+/).filter(Boolean); // split by spaces or asterisks
      if (tokens.length === 0) return text;
      
      let highlighted = text;
      tokens.forEach(token => {
        const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match token, case insensitive
        const regex = new RegExp(`(${safeToken})`, 'gi');
        // We use a temporary placeholder to avoid double highlighting the mark tags themselves
        highlighted = highlighted.replace(regex, '%%%HIGHLIGHT%%%$1%%%ENDHIGHLIGHT%%%');
      });

      // Replace placeholders with actual HTML
      highlighted = highlighted.replace(/%%%HIGHLIGHT%%%/g, '<mark class="bg-sales-orange/30 text-sales-orange-light px-1 rounded font-bold">');
      highlighted = highlighted.replace(/%%%ENDHIGHLIGHT%%%/g, '</mark>');
      
      return highlighted;
    } catch(e) {
      return text;
    }
  };

  const isMessageMatch = (rawText, rawQuery) => {
    if (!rawQuery || !rawText) return false;
    const text = String(rawText);
    const query = String(rawQuery);
    const tokens = query.split(/[\s*]+/).filter(Boolean);
    if (tokens.length === 0) return false;
    
    return tokens.some(token => {
      const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeToken})`, 'gi');
      return regex.test(text);
    });
  };

  const totalMatches = React.useMemo(() => {
    if (!searchQuery || !messages) return 0;
    return messages.filter(msg => msg.type !== 'separator' && isMessageMatch(msg.content, searchQuery)).length;
  }, [messages, searchQuery]);

  const firstMatchId = React.useMemo(() => {
    if (!searchQuery || !messages) return null;
    const match = messages.find(msg => msg.type !== 'separator' && isMessageMatch(msg.content, searchQuery));
    return match ? match.id : null;
  }, [messages, searchQuery]);

  const [loadingPrev, setLoadingPrev] = useState(false);
  const [errorPrev, setErrorPrev] = useState(false);
  
  const [loadingNext, setLoadingNext] = useState(false);
  const [errorNext, setErrorNext] = useState(false);

  const containerRef = useRef(null);
  const targetMessageRef = useRef(null);
  const isFirstLoad = useRef(true);
  
  // For preserving scroll
  const prevHeightRef = useRef(0);
  const isPrependingRef = useRef(false);

  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (!conversationId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    isFirstLoad.current = true;

    const fetchChat = async () => {
      try {
        const url = new URL(`/api/chat/${conversationId}/messages`, window.location.origin);
        if (targetMessageId) url.searchParams.append('aroundMessageId', targetMessageId);
        
        const res = await axios.get(url.toString(), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal
        });
        
        setMessages(res.data.data);
        setMeta(res.data.meta);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError('El chat no existe o no tienes acceso');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchChat();

    return () => controller.abort();
  }, [conversationId, targetMessageId, token]);

  useLayoutEffect(() => {
    // Preserve scroll position when prepending messages
    if (isPrependingRef.current && containerRef.current) {
      const newHeight = containerRef.current.scrollHeight;
      const heightDiff = newHeight - prevHeightRef.current;
      containerRef.current.scrollTop += heightDiff;
      isPrependingRef.current = false;
    }
  }, [messages]);

  useLayoutEffect(() => {
    if (isFirstLoad.current && !loading && messages.length > 0) {
      isFirstLoad.current = false;
      
      // Handle auto-scroll to target message
      if (targetMessageId && targetMessageRef.current) {
        targetMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetMessageRef.current.focus();
      } else if (containerRef.current) {
        // Scroll to bottom if no target
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  }, [loading, messages, targetMessageId]);

  const loadAdjacentSession = async (type) => {
    const sessionId = type === 'previous' ? meta?.previousSessionId : meta?.nextSessionId;
    if (!sessionId) return;
    
    type === 'previous' ? setLoadingPrev(true) : setLoadingNext(true);
    type === 'previous' ? setErrorPrev(false) : setErrorNext(false);
    
    try {
      const url = new URL(`/api/chat/${sessionId}/messages`, window.location.origin);
      url.searchParams.append('limit', '50');
      
      const res = await axios.get(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      const newMessages = res.data.data;
      if(newMessages.length === 0) {
        if (type === 'previous') setMeta(prev => ({ ...prev, previousSessionId: null }));
        else setMeta(prev => ({ ...prev, nextSessionId: null }));
        return;
      }
      const newMeta = res.data.meta;
      
      if (type === 'previous') {
        if (containerRef.current) {
           prevHeightRef.current = containerRef.current.scrollHeight;
           isPrependingRef.current = true;
        }
        setMessages(prev => [...newMessages, { type: 'separator', text: 'Sesión anterior' }, ...prev]);
        setMeta(prev => ({ ...prev, previousSessionId: newMeta.previousSessionId }));
      } else {
        setMessages(prev => [...prev, { type: 'separator', text: 'Siguiente sesión' }, ...newMessages]);
        setMeta(prev => ({ ...prev, nextSessionId: newMeta.nextSessionId }));
      }
    } catch (err) {
      type === 'previous' ? setErrorPrev(true) : setErrorNext(true);
    } finally {
      type === 'previous' ? setLoadingPrev(false) : setLoadingNext(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="hidden lg:flex flex-[2] bg-sales-slate-900/60 rounded-lg border border-sales-slate-800 items-center justify-center min-h-[500px] backdrop-blur-sm shadow-xl">
        <div className="text-center">
          <MessageSquare size={48} className="mx-auto text-sales-slate-700 mb-4" />
          <h3 className="text-lg font-medium text-sales-slate-400">Selecciona un chat</h3>
          <p className="text-sm text-sales-slate-500">El historial se mostrará aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sales-slate-900 rounded-lg border border-sales-slate-800 shadow-xl flex-[2] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-sales-slate-800 bg-sales-slate-900/90 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            aria-label="Volver a los resultados de búsqueda"
            className="lg:hidden p-2 mr-2 text-sales-slate-400 hover:text-sales-slate-100 hover:bg-sales-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-sales-slate-100">Previsualización de Chat</h2>
        </div>
        {searchQuery && totalMatches > 0 && (
          <span className="text-xs text-sales-orange-light font-medium bg-sales-orange/10 px-2 py-1 rounded">
            {totalMatches} {totalMatches === 1 ? 'coincidencia' : 'coincidencias'} en esta vista
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 bg-sales-slate-950 custom-scrollbar" aria-live="polite">
        {loading ? (
          <div className="flex justify-center py-10">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="sr-only">Cargando chat...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-sales-coral-400">{typeof error === "object" ? JSON.stringify(error) : error}</div>
        ) : (
          <div className="space-y-4">
            {meta?.previousSessionId && (
              <ContiguousSessionCard 
                type="previous" 
                loading={loadingPrev} 
                error={errorPrev} 
                onClick={() => loadAdjacentSession('previous')} 
              />
            )}
            
            {messages.map((msg, index) => {
              if (msg.type === 'separator') {
                return (
                   <div key={`sep-${index}`} className="flex justify-center my-4">
                     <span className="px-3 py-1 bg-sales-slate-800 border border-sales-slate-700 text-xs text-sales-slate-400 rounded-full">
                       {msg.text}
                     </span>
                   </div>
                );
              }
              
              let showDateLabel = false;
              if (index === 0 || messages[index - 1]?.type === 'separator') {
                showDateLabel = true;
              } else {
                const prevMsg = messages[index - 1];
                if (prevMsg && prevMsg.createdAt) {
                  const currentDate = new Date(msg.createdAt).toDateString();
                  const prevDate = new Date(prevMsg.createdAt).toDateString();
                  if (currentDate !== prevDate) {
                    showDateLabel = true;
                  }
                }
              }
              
              const formatDateLabel = (dateString) => {
                const date = new Date(dateString);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
            
                if (date.toDateString() === today.toDateString()) return 'Hoy';
                if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
                return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              };

              const isMyTeam = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN', 'IA'].includes(msg.senderType);
              const isClient = msg.senderType === 'CLIENT';
              const isTarget = (searchQuery && isMessageMatch(msg.content, searchQuery)) || msg.id === targetMessageId;
              
              let senderLabel = 'Asesor';
              if (isClient) senderLabel = 'Cliente';
              else if (msg.senderType === 'IA') senderLabel = '🤖 Bot (IA)';
              else if (msg.senderType === 'SYSTEM') senderLabel = '💻 Sistema';
              else if (msg.senderType === 'COORDINATOR' || msg.senderType === 'ADMIN') senderLabel = '🛡️ Coordinador';
              else senderLabel = vendorName ? 👤  : '👤 Asesor';

              return (
                <React.Fragment key={`${msg.id}-${index}`}>
                {showDateLabel && (
                  <div className="flex justify-center w-full my-4">
                    <span className="bg-sales-slate-800/80 text-sales-slate-300 text-xs px-3 py-1 rounded-md shadow-sm border border-sales-slate-700/50 uppercase tracking-wide font-medium">
                      {formatDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div 
                  ref={msg.id === firstMatchId || msg.id === targetMessageId ? targetMessageRef : null}
                  tabIndex={isTarget ? -1 : undefined}
                  className={`flex flex-col ${isMyTeam ? 'items-end' : 'items-start'} mb-4`}
                >
                  <span className="text-[10px] text-sales-slate-500 mb-1 ml-1 mr-1">
                    {senderLabel} • {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(new Date(msg.createdAt))}
                  </span>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2 relative shadow-sm ${
                      isTarget 
                        ? 'ring-2 ring-sales-orange bg-sales-slate-800' 
                        : isMyTeam 
                          ? 'bg-sales-slate-800 text-sales-slate-100 rounded-tr-none' 
                          : 'bg-sales-slate-900 border border-sales-slate-800 text-sales-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mb-2">
                        {msg.attachments.map((att, i) => (
                          <SecureMedia
                            key={i}
                            url={att.url}
                            type={att.type}
                            fallbackText={att.name}
                            className="w-full max-w-sm rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(highlightText(msg.snippet || msg.content || '', searchQuery), {
                        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'],
                        ALLOWED_ATTR: ['class']
                      })
                    }} />
                    <div className={`text-[10px] mt-1 text-right ${isMyTeam ? 'text-sales-slate-400' : 'text-sales-slate-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                </React.Fragment>
              );
            })}

            {meta?.nextSessionId && (
              <ContiguousSessionCard 
                type="next" 
                loading={loadingNext} 
                error={errorNext} 
                onClick={() => loadAdjacentSession('next')} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
