import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import ContiguousSessionCard from './ContiguousSessionCard';

export default function ChatViewerDetail({ conversationId, targetMessageId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

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
        targetMessageRef.current.classList.add('bg-yellow-100', 'transition-colors', 'duration-1000');
        const timer = setTimeout(() => {
          if (targetMessageRef.current) {
            targetMessageRef.current.classList.remove('bg-yellow-100');
          }
        }, 3000);
        return () => clearTimeout(timer);
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
      <div className="hidden lg:flex flex-[2] bg-gray-100 rounded-lg border border-gray-200 items-center justify-center min-h-[500px]">
        <div className="text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Selecciona un chat</h3>
          <p className="text-sm text-gray-400">El historial se mostrará aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm flex-[2]">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button 
          onClick={onBack}
          aria-label="Volver a los resultados de búsqueda"
          className="lg:hidden p-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Previsualización de Chat</h2>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50" aria-live="polite">
        {loading ? (
          <div className="flex justify-center py-10">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="sr-only">Cargando chat...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{typeof error === "object" ? JSON.stringify(error) : error}</div>
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
                     <span className="px-3 py-1 bg-gray-200 text-xs text-gray-600 rounded-full">
                       {msg.text}
                     </span>
                   </div>
                );
              }
              const isTarget = msg.id === targetMessageId;
              const isVendor = msg.senderType === 'VENDOR' || msg.senderType === 'SYSTEM';
              
              return (
                <div 
                  key={`${msg.id}-${index}`} 
                  ref={isTarget ? targetMessageRef : null}
                  tabIndex={isTarget ? -1 : undefined}
                  className={`flex flex-col max-w-[80%] rounded-lg p-3 ${
                    isVendor 
                      ? 'bg-blue-100 text-blue-900 self-end ml-auto rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-800 self-start mr-auto rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content}</p>
                  <span className="text-[10px] text-gray-500 text-right mt-1 opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
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
