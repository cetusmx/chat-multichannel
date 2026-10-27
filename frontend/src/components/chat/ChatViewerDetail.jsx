import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MessageSquare, AlertTriangle } from 'lucide-react';
import DOMPurify from 'dompurify';
import useAuthStore from '../../stores/useAuthStore';
import ContiguousSessionCard from './ContiguousSessionCard';
import SecureMedia from '../SecureMedia';
import { Badge, EmptyState, Eyebrow, IconButton, Spinner } from '../ui/index.js';
import { formatTime, formatDayLabel } from '../../utils/formatDate.js';
import { cn } from '../../utils/cn.js';

const MARK_CLASS = 'bg-accent/25 text-fg rounded-sm px-0.5';
const TEAM_SENDERS = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN', 'IA'];

function senderLabel(msg, vendorName) {
  if (msg.senderType === 'CLIENT') return 'Cliente';
  if (msg.senderType === 'IA') return 'Asistente IA';
  if (msg.senderType === 'SYSTEM') return 'Automático';
  if (msg.senderType === 'COORDINATOR' || msg.senderType === 'ADMIN') return 'Coordinador';
  return vendorName || 'Asesor';
}

export default function ChatViewerDetail({ conversationId, targetMessageId, searchQuery, vendorName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const highlightText = (rawText, rawQuery) => {
    if (!rawQuery || !rawText) return String(rawText || '');
    const text = String(rawText);
    try {
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
      highlighted = highlighted.replace(/%%%HIGHLIGHT%%%/g, `<mark class="${MARK_CLASS}">`);
      highlighted = highlighted.replace(/%%%ENDHIGHLIGHT%%%/g, '</mark>');

      return highlighted;
    } catch {
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
          signal: controller.signal,
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

    if (type === 'previous') {
      setLoadingPrev(true);
      setErrorPrev(false);
    } else {
      setLoadingNext(true);
      setErrorNext(false);
    }

    try {
      const url = new URL(`/api/chat/${sessionId}/messages`, window.location.origin);
      url.searchParams.append('limit', '50');

      const res = await axios.get(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const newMessages = res.data.data;
      if (newMessages.length === 0) {
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
    } catch {
      if (type === 'previous') setErrorPrev(true);
      else setErrorNext(true);
    } finally {
      if (type === 'previous') setLoadingPrev(false);
      else setLoadingNext(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-lg border border-border bg-surface">
        <EmptyState
          icon={MessageSquare}
          title="Selecciona un chat"
          description="El historial de la conversación se mostrará aquí."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            icon={ArrowLeft}
            label="Volver a los resultados de búsqueda"
            size="md"
            onClick={onBack}
            className="lg:hidden"
          />
          <div className="min-w-0">
            <Eyebrow tone="muted">Vista previa</Eyebrow>
            <h2 className="truncate text-sm font-semibold text-fg leading-tight">Conversación</h2>
          </div>
        </div>
        {searchQuery && totalMatches > 0 && (
          <Badge tone="accent" className="shrink-0">
            {totalMatches} {totalMatches === 1 ? 'coincidencia' : 'coincidencias'}
          </Badge>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-bg p-4 custom-scrollbar" aria-live="polite">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size={20} label="Cargando chat" />
          </div>
        ) : error ? (
          <EmptyState
            compact
            icon={AlertTriangle}
            title="No se pudo cargar el chat"
            description={typeof error === 'object' ? JSON.stringify(error) : error}
          />
        ) : (
          <div className="space-y-3">
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
                  <div key={`sep-${index}`} className="my-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <Eyebrow tone="muted">{msg.text}</Eyebrow>
                    <span className="h-px flex-1 bg-border" aria-hidden />
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

              const isMyTeam = TEAM_SENDERS.includes(msg.senderType);
              const isTarget = (searchQuery && isMessageMatch(msg.content, searchQuery)) || msg.id === targetMessageId;
              const inverse = isMyTeam && !isTarget;

              return (
                <React.Fragment key={`${msg.id}-${index}`}>
                  {showDateLabel && (
                    <div className="my-4 flex w-full justify-center">
                      <span className="rounded-md border border-border bg-surface px-2.5 py-1">
                        <Eyebrow tone="muted">{formatDayLabel(msg.createdAt)}</Eyebrow>
                      </span>
                    </div>
                  )}
                  <div
                    ref={msg.id === firstMatchId || msg.id === targetMessageId ? targetMessageRef : null}
                    tabIndex={isTarget ? -1 : undefined}
                    className={cn('flex flex-col outline-none', isMyTeam ? 'items-end' : 'items-start')}
                  >
                    <span className="mb-1 px-1 font-mono text-[10px] text-fg-subtle">
                      {senderLabel(msg, vendorName)} · {formatTime(msg.createdAt)}
                    </span>
                    <div
                      className={cn(
                        'relative max-w-[85%] rounded-lg px-3.5 py-2.5',
                        isTarget
                          ? 'bg-surface-2 text-fg ring-2 ring-accent'
                          : inverse
                            ? 'rounded-br-sm bg-surface-inverse text-fg-inverse'
                            : 'rounded-bl-sm bg-surface-3 text-fg',
                      )}
                    >
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 flex flex-col gap-2">
                          {msg.attachments.map((att, i) => (
                            <SecureMedia
                              key={i}
                              url={att.url}
                              type={att.type}
                              fallbackText={att.name}
                              className="w-full max-w-sm rounded-md"
                            />
                          ))}
                        </div>
                      )}
                      <p
                        className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(highlightText(msg.snippet || msg.content || '', searchQuery), {
                            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'],
                            ALLOWED_ATTR: ['class'],
                          }),
                        }}
                      />
                      <div className={cn('tnum mt-1.5 text-right font-mono text-[10px]', inverse ? 'text-fg-inverse/55' : 'text-fg-subtle')}>
                        {formatTime(msg.createdAt)}
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
