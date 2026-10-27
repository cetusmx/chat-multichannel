import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import {
  ChevronLeft, MessageSquare, ShoppingCart, User,
  Phone, CheckCircle, Clock, Search,
  Paperclip, ChevronDown, ChevronUp, X, AlertCircle,
} from 'lucide-react';
import SecureMedia from '../components/SecureMedia';
import { Avatar, Badge, Button, EmptyState, Eyebrow, IconButton, Input, Spinner, StatusPill } from '../components/ui/index.js';
import { formatDate, formatMoney, formatTime } from '../utils/formatDate.js';
import { cn } from '../utils/cn.js';
import { messagePreview, stripMediaPrefix } from '../utils/whatsappFormat.jsx';

const SENDER_LABELS = { IA: 'Asistente IA', SYSTEM: 'Sistema', CLIENT: 'Cliente' };

function ProfileShell({ onBack, title, children }) {
  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-5 py-3">
        <IconButton icon={ChevronLeft} label="Volver a clientes" onClick={onBack} />
        <div className="min-w-0">
          <Eyebrow tone="muted">Clientes</Eyebrow>
          <h1 className="truncate text-sm font-semibold text-fg">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChats, setExpandedChats] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toggleChatExpand = (chatId) => {
    setExpandedChats(prev => ({ ...prev, [chatId]: !prev[chatId] }));
  };

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const fetchClient = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const response = await get(`/clients/${id}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status !== 499) setIsError(true);
          return;
        }
        const data = await response.json();
        setClient(data.data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching client details:', error);
          setIsError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
    return () => controller.abort();
  }, [id]);

  const handleNewOutboundChat = () => {
    navigate('/chat', { state: { draftClient: client } });
  };

  const filteredConversations = useMemo(() => {
    if (!client?.conversations) return [];

    let result = client.conversations;

    if (startDate || endDate) {
      result = result.filter(c => {
        const d = new Date(c.createdAt);
        const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        if (startDate && localDate < startDate) return false;
        if (endDate && localDate > endDate) return false;
        return true;
      });
    }

    if (!searchQuery.trim()) return result;

    const query = searchQuery.toLowerCase();

    return result.map(conv => {
      const matchingMessages = conv.messages?.filter(m =>
        m.content.toLowerCase().includes(query),
      ) || [];

      const matchesMeta =
        conv.status.toLowerCase().includes(query) ||
        (conv.vendor?.name || '').toLowerCase().includes(query);

      if (matchesMeta || matchingMessages.length > 0) {
        return {
          ...conv,
          matchingMessages: matchingMessages,
        };
      }
      return null;
    }).filter(Boolean);
  }, [client, searchQuery, startDate, endDate]);

  const totalMessageMatches = useMemo(() => {
    if (!searchQuery.trim() || !filteredConversations) return 0;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'gi');

    return filteredConversations.reduce((acc, conv) => {
      const msgs = conv.messages || [];
      const matchesInConv = msgs.reduce((sum, m) => {
        const found = m.content.match(regex);
        return sum + (found ? found.length : 0);
      }, 0);
      return acc + matchesInConv;
    }, 0);
  }, [filteredConversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <Spinner size={24} />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <ProfileShell onBack={() => navigate('/clients')} title="Expediente del cliente">
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={AlertCircle}
            title="No se pudo cargar el expediente"
            description="Ocurrió un error al cargar la información del cliente. Intenta de nuevo."
            action={<Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => navigate('/clients')}>Volver a clientes</Button>}
          />
        </div>
      </ProfileShell>
    );
  }

  const successfulPurchases = client.conversations?.filter(c => c.status === 'CLOSED_WON').length || 0;
  const shipping = client.cartData?.shippingAddress;
  const billing = client.cartData?.billingAddress;
  const hasDateFilter = Boolean(startDate || endDate);

  return (
    <ProfileShell onBack={() => navigate('/clients')} title={client.name || 'Expediente del cliente'}>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-b border-border bg-surface p-5 custom-scrollbar md:w-80 md:border-b-0 md:border-r lg:w-96">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-fg">{client.name || 'Sin nombre'}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-fg-muted">
                <Phone size={12} aria-hidden />
                <span className="tnum font-mono text-xs">{client.phoneNumber}</span>
              </p>
            </div>
          </div>

          <section aria-label="Datos del cliente">
            <Eyebrow tone="muted" className="mb-2 block">Datos</Eyebrow>
            <dl className="divide-y divide-border rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-[13px] text-fg-muted">RFC</dt>
                <dd className="font-mono text-xs text-fg">{client.cartData?.rfc || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-[13px] text-fg-muted">Compras exitosas</dt>
                <dd className="tnum flex items-center gap-1.5 font-mono text-xs font-medium text-success">
                  <CheckCircle size={12} aria-hidden />
                  {successfulPurchases}
                </dd>
              </div>
            </dl>
          </section>

          {(shipping || billing) && (
            <section aria-label="Domicilios">
              <Eyebrow tone="muted" className="mb-2 block">Domicilios</Eyebrow>
              <div className="space-y-3 rounded-lg border border-border px-3.5 py-3">
                {shipping && (
                  <div>
                    <span className="mb-0.5 block text-xs text-fg-subtle">Envío</span>
                    <p className="text-[13px] leading-relaxed text-fg">{shipping}</p>
                  </div>
                )}
                {billing && (
                  <div>
                    <span className="mb-0.5 block text-xs text-fg-subtle">Fiscal</span>
                    <p className="text-[13px] leading-relaxed text-fg">{billing}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="mt-auto pt-2">
            <Button variant="primary" icon={MessageSquare} loading={isStartingChat} onClick={handleNewOutboundChat} className="w-full">
              Nuevo chat saliente
            </Button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-3 xl:flex-row xl:items-center">
            <div className="relative flex flex-1 items-center">
              <Input
                leftIcon={Search}
                placeholder="Buscar en el historial de chats"
                aria-label="Buscar en el historial"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(searchQuery && 'pr-36')}
              />
              {searchQuery && (
                <div className="absolute right-1.5 flex items-center gap-1">
                  {searchQuery.trim() && (
                    <Badge tone="accent">
                      {totalMessageMatches} {totalMessageMatches === 1 ? 'coincidencia' : 'coincidencias'}
                    </Badge>
                  )}
                  <IconButton icon={X} label="Limpiar búsqueda" size="sm" onClick={() => setSearchQuery('')} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Fecha inicial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-fg-subtle">–</span>
              <Input
                type="date"
                aria-label="Fecha final"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
              {hasDateFilter && (
                <IconButton icon={X} label="Limpiar fechas" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }} />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {filteredConversations.length > 0 ? (
              <ol className="space-y-4">
                {filteredConversations.map((conv, idx) => {
                  const msgsToDisplay = [...(conv.messages || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                  const matchingMessages = [...(conv.matchingMessages || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                  const isWon = conv.status === 'CLOSED_WON';
                  const hasPurchaseEvidence = isWon || msgsToDisplay.some(m => m.content.toLowerCase().includes('carrito') || m.content.toLowerCase().includes('compra'));
                  const isChatExpanded = expandedChats[conv.id] ?? Boolean(searchQuery.trim());
                  const ChevronIcon = isChatExpanded ? ChevronUp : ChevronDown;

                  return (
                    <li key={conv.id} className="relative flex gap-4">
                      {idx !== filteredConversations.length - 1 && (
                        <span className="absolute left-[5px] top-6 -bottom-4 w-px bg-border" aria-hidden />
                      )}

                      <span
                        className={cn('relative z-10 mt-[15px] h-[11px] w-[11px] shrink-0 rounded-full border-2 border-bg', conv.isOutbound ? 'bg-accent' : 'bg-fg-subtle')}
                        aria-hidden
                      />

                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface md:flex-row">
                        <div className="min-w-0 flex-1 px-4 py-3">
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-3 text-left"
                            onClick={() => toggleChatExpand(conv.id)}
                            aria-expanded={isChatExpanded}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Badge tone={conv.isOutbound ? 'accent' : 'neutral'}>{conv.isOutbound ? 'Saliente' : 'Entrante'}</Badge>
                                  <StatusPill status={conv.status} variant="full" />
                                </div>
                                <div className="flex items-center gap-3 text-xs text-fg-muted">
                                  <span className="flex items-center gap-1">
                                    <User size={12} className="text-fg-subtle" aria-hidden />
                                    <span className="font-medium text-fg">{conv.vendor?.name || 'Asistente IA'}</span>
                                  </span>
                                  <span className="tnum flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
                                    <Clock size={12} aria-hidden />
                                    {formatDate(conv.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {!isChatExpanded && msgsToDisplay.length > 0 && (() => {
                                const snippetMsg = searchQuery.trim() && matchingMessages.length > 0 ? matchingMessages[0] : msgsToDisplay[msgsToDisplay.length - 1];
                                const prefix = searchQuery.trim() && matchingMessages.length > 0 ? 'Coincidencia' : 'Último mensaje';
                                return (
                                  <p className="mt-2 truncate rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[13px] text-fg-muted">
                                    <span className="mr-2 font-mono text-[10px] uppercase tracking-wide text-fg-subtle">{prefix}</span>
                                    {messagePreview(snippetMsg.content, 'Mensaje con archivo adjunto')}
                                  </p>
                                );
                              })()}
                            </div>

                            <ChevronIcon size={16} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
                          </button>

                          {isChatExpanded && (
                            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                              {msgsToDisplay.map(msg => {
                                const content = stripMediaPrefix(msg.content);
                                let displayContent = content;
                                if (searchQuery) {
                                  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  const parts = content.split(new RegExp(`(${escapedQuery})`, 'gi'));
                                  displayContent = parts.map((part, i) =>
                                    part.toLowerCase() === searchQuery.toLowerCase() ?
                                      <mark key={i} className="rounded-sm bg-accent/40 px-0.5 text-inherit">{part}</mark> : part,
                                  );
                                }

                                const isClient = msg.senderType === 'CLIENT';
                                const senderLabel = SENDER_LABELS[msg.senderType] || conv.vendor?.name || 'Asesor';

                                return (
                                  <div key={msg.id} className={cn('flex flex-col', isClient ? 'items-start' : 'items-end')}>
                                    <span className="tnum mb-1 px-1 font-mono text-[10px] text-fg-subtle">
                                      {senderLabel} · {formatTime(msg.createdAt)}
                                    </span>
                                    <div
                                      className={cn(
                                        'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm',
                                        isClient ? 'rounded-bl-sm bg-surface-3 text-fg' : 'rounded-br-sm bg-surface-inverse text-fg-inverse',
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
                                              className="w-full rounded-md"
                                            />
                                          ))}
                                        </div>
                                      )}
                                      {displayContent && (
                                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                                          {displayContent}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {msgsToDisplay.length === 0 && (
                                <p className="inline-flex items-center gap-1.5 text-sm italic text-fg-subtle"><Paperclip size={12} aria-hidden /> No hay mensajes legibles.</p>
                              )}
                            </div>
                          )}
                        </div>

                        {isChatExpanded && hasPurchaseEvidence && (
                          <div className="w-full border-t border-border bg-surface-2 p-4 md:w-64 md:border-l md:border-t-0">
                            <div className="mb-2 flex items-center gap-2">
                              <ShoppingCart size={14} className={isWon ? 'text-success' : 'text-fg-muted'} aria-hidden />
                              <h4 className={cn('text-sm font-semibold', isWon ? 'text-success' : 'text-fg-muted')}>Evidencia de carrito</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-fg-muted">
                              {isWon
                                ? 'Esta conversación terminó en una venta. El carrito asociado fue procesado y guardado en el expediente.'
                                : 'Se detectó actividad de carrito o cotización en el texto de esta conversación.'}
                            </p>
                            {isWon && (conv.cartSnapshot || client.cartData) && (() => {
                              const historicCartData = conv.cartSnapshot || client.cartData;
                              const items = Array.isArray(historicCartData) ? historicCartData : (historicCartData?.items || []);
                              const total = items.reduce((sum, item) => {
                                const qty = item.cantidad || item.quantity || 1;
                                const price = item.precio || item.precio_unitario || item.price || 0;
                                return sum + (price * qty);
                              }, 0);
                              return (
                                <div className="mt-3 border-t border-border pt-3 text-xs">
                                  <div className="mb-2 max-h-32 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                                    {items.map((item, itemIdx) => {
                                      const name = item.descripcion || item.clave || item.name || 'Producto';
                                      const quantity = item.cantidad || item.quantity || 1;
                                      const price = item.precio || item.precio_unitario || item.price || 0;
                                      return (
                                        <div key={itemIdx} className="flex items-start justify-between gap-2 text-fg-muted">
                                          <span className="leading-tight">
                                            <span className="tnum font-mono text-[11px] text-fg">{quantity}×</span> {name}
                                          </span>
                                          <span className="tnum whitespace-nowrap font-mono text-[11px] text-fg">{formatMoney(price * quantity)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center justify-between border-t border-border pt-2">
                                    <span className="font-medium text-fg-muted">Total aproximado</span>
                                    <span className="tnum font-mono text-sm font-semibold text-success">
                                      {total > 0 ? formatMoney(total) : '—'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                compact
                icon={Search}
                title="Sin conversaciones"
                description={searchQuery || hasDateFilter ? 'No se encontraron conversaciones que coincidan con la búsqueda.' : 'Este cliente aún no tiene conversaciones registradas.'}
              />
            )}
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
