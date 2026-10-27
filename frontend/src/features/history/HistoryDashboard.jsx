import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ChevronLeft, ChevronRight, MessageSquare, History as HistoryIcon } from 'lucide-react';
import { get } from '../../services/api.js';
import { Badge, Button, EmptyState, Eyebrow, IconButton, Input, PageHeader, Select, Spinner, StatusPill } from '../../components/ui/index.js';
import { formatDate, formatTime } from '../../utils/formatDate.js';
import { cn } from '../../utils/cn.js';

const SENDER_LABELS = { IA: 'Asistente IA', SYSTEM: 'Sistema', CLIENT: 'Cliente' };

export default function HistoryDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendor, setVendor] = useState('');

  const [vendors, setVendors] = useState([]);

  const [historyData, setHistoryData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedChat, setSelectedChat] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const chatContainerRef = useRef(null);

  const matchCount = useMemo(() => {
    if (!localSearch || !selectedChat?.messages) return 0;
    const term = localSearch.toLowerCase();
    return selectedChat.messages.reduce((count, msg) => {
      const text = (msg.content || msg.text || '').toLowerCase();
      return count + (text.split(term).length - 1);
    }, 0);
  }, [localSearch, selectedChat]);

  useEffect(() => {
    if (localSearch && chatContainerRef.current) {
      setTimeout(() => {
        const firstMark = chatContainerRef.current.querySelector('mark');
        if (firstMark) {
          firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [localSearch, selectedChat]);

  const limit = 15;

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await get('/users?limit=1000');
        if (!res.ok) throw new Error('Error fetching users');
        const json = await res.json();
        const data = json.data?.users || json.data || json.items || json;
        if (Array.isArray(data)) {
          setVendors(data);
        } else if (data && Array.isArray(data.items)) {
          setVendors(data.items);
        } else {
          setVendors(data || []);
        }
      } catch (err) {
        console.error('Error fetching vendors', err);
      }
    };
    fetchVendors();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(vendor && vendor !== 'AI_ABANDONED' && { vendorId: vendor }),
        ...(vendor === 'AI_ABANDONED' && { aiAbandoned: 'true' }),
      });
      const res = await get(`/chat/history?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching history');
      const json = await res.json();

      const data = json.data?.conversations || json.data || json.items || json;
      const totalCount = json.meta?.total || json.total || json.totalItems || data?.length || 0;

      if (Array.isArray(data)) {
        setHistoryData(data);
        setTotal(totalCount);
      } else if (data && Array.isArray(data.items)) {
        setHistoryData(data.items);
        setTotal(data.total);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, startDate, endDate, vendor]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setIsPanelOpen(true);
    setLocalSearch(searchTerm);

    try {
      const res = await get(`/chat/${chat.id || chat._id}/messages`);
      if (!res.ok) throw new Error('Error fetching messages');
      const json = await res.json();
      const messages = json.data?.messages || json.data || json.items || json;
      setSelectedChat(prev => ({ ...prev, messages: Array.isArray(messages) ? messages : [] }));
    } catch (err) {
      console.error('Error fetching messages', err);
      setSelectedChat(prev => ({ ...prev, messages: chat.messages || [] }));
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedChat(null), 300);
  };

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPanelOpen]);

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) {
      return <span>{text}</span>;
    }
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="rounded-sm bg-accent/40 px-0.5 text-inherit">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const hasFilters = Boolean(searchTerm || startDate || endDate || vendor);

  return (
    <div>
      <PageHeader
        eyebrow="Conversaciones"
        title="Historial"
        description="Busca y revisa conversaciones cerradas de todo el equipo."
      />

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            leftIcon={Search}
            placeholder="Buscar en todos los chats"
            aria-label="Buscar en el historial"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Fecha inicial"
            className="w-36"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
          />
          <span className="text-fg-subtle">–</span>
          <Input
            type="date"
            aria-label="Fecha final"
            className="w-36"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            aria-label="Filtrar por asesor"
            value={vendor}
            onChange={e => { setVendor(e.target.value); setPage(1); }}
          >
            <option value="">Todos los asesores</option>
            <option value="AI_ABANDONED">Abandonados con IA</option>
            {vendors.map(v => (
              <option key={v.id || v._id} value={v.id || v._id}>{v.name || v.username || v.email}</option>
            ))}
          </Select>
        </div>

        <Button type="submit" variant="primary" icon={Search}>Buscar</Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Fecha</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Cliente / asesor</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-left"><Eyebrow tone="muted">Estado</Eyebrow></th>
                <th className="border-b border-border px-4 py-2.5 text-right"><Eyebrow tone="muted">Acciones</Eyebrow></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <Spinner size={20} />
                  </td>
                </tr>
              ) : historyData.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      compact
                      icon={HistoryIcon}
                      title="Sin resultados"
                      description={hasFilters ? 'Ninguna conversación coincide con los filtros.' : 'Aún no hay conversaciones en el historial.'}
                    />
                  </td>
                </tr>
              ) : (
                historyData.map((chat) => {
                  const date = formatDate(chat.createdAt || chat.updatedAt || Date.now());
                  const clientName = chat.client?.name || chat.clientName || chat.contact?.name || chat.clientPhone || 'Desconocido';
                  const advisorName = chat.vendor?.name || chat.user?.name || chat.vendorName || 'No asignado';
                  const isAiAbandoned = chat.status === 'CLOSED_INACTIVE' && !chat.vendorId && !chat.vendor;

                  return (
                    <tr
                      key={chat.id || chat._id}
                      className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-surface-2/60"
                      onClick={() => openChat(chat)}
                    >
                      <td className="tnum px-4 py-3 font-mono text-xs text-fg-muted">{date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-fg">{clientName}</span>
                          <span className="text-xs text-fg-subtle">· {advisorName}</span>
                        </div>
                        {searchTerm && chat.messages && chat.messages.length > 0 && (
                          <div className="mt-1 flex max-w-md items-start gap-1.5 whitespace-normal text-xs text-fg-muted">
                            <MessageSquare size={12} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
                            <span className="line-clamp-2">
                              {highlightText(chat.messages[0].searchSnippet || chat.messages[0].content || chat.messages[0].text, searchTerm)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAiAbandoned ? <Badge tone="warning">Abandonado con IA</Badge> : <StatusPill status={chat.status} variant="full" />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="xs">Ver chat</Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <div>
              Mostrando <span className="tnum font-medium text-fg">{(page - 1) * limit + 1}</span> a{' '}
              <span className="tnum font-medium text-fg">{Math.min(page * limit, total)}</span> de{' '}
              <span className="tnum font-medium text-fg">{total}</span> resultados
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                icon={ChevronLeft}
                label="Página anterior"
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              />
              <span className="tnum px-2 text-xs">Página {page} de {totalPages}</span>
              <IconButton
                icon={ChevronRight}
                label="Página siguiente"
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              />
            </div>
          </div>
        )}
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={closePanel} role="presentation">
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de conversación"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Eyebrow tone="muted">Historial</Eyebrow>
                  <h2 className="truncate text-sm font-semibold text-fg">
                    Chat con {selectedChat?.client?.name || selectedChat?.clientName || 'Cliente'}
                  </h2>
                </div>
                <IconButton icon={X} label="Cerrar" onClick={closePanel} />
              </div>

              <div className="relative flex items-center">
                <Input
                  size="sm"
                  leftIcon={Search}
                  placeholder="Buscar en esta conversación"
                  aria-label="Buscar en esta conversación"
                  className={cn(localSearch && 'pr-40')}
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                />
                {localSearch && (
                  <div className="absolute right-1 flex items-center gap-1">
                    <span className="tnum font-mono text-[10px] text-fg-muted">
                      {matchCount} {matchCount === 1 ? 'coincidencia' : 'coincidencias'}
                    </span>
                    <IconButton icon={X} label="Limpiar búsqueda" size="sm" onClick={() => setLocalSearch('')} />
                  </div>
                )}
              </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
              {selectedChat?.messages?.length > 0 ? (
                selectedChat.messages.map((msg, idx) => {
                  const isClient = msg.senderType === 'CLIENT';
                  const textContent = msg.content || msg.text || '';
                  const senderLabel = SENDER_LABELS[msg.senderType] || selectedChat?.vendor?.name || 'Asesor';

                  return (
                    <div key={msg.id || msg._id || idx} className={cn('flex flex-col', isClient ? 'items-start' : 'items-end')}>
                      <span className="tnum mb-1 px-1 font-mono text-[10px] text-fg-subtle">
                        {senderLabel} · {formatTime(msg.createdAt || Date.now())}
                      </span>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm',
                          isClient ? 'rounded-bl-sm bg-surface-3 text-fg' : 'rounded-br-sm bg-surface-inverse text-fg-inverse',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {highlightText(textContent, localSearch)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState compact icon={MessageSquare} title="Sin mensajes" description="No hay mensajes disponibles para esta conversación." />
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
