import { useState, useEffect } from 'react';
import { X, MessageSquare, ShoppingCart, Clock, Phone } from 'lucide-react';
import { get, post } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../../stores/useToastStore.js';
import { Avatar, Badge, Button, EmptyState, Eyebrow, IconButton, Spinner, StatusPill } from '../../../components/ui/index.js';
import { formatDate } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

export default function ClientProfileDrawer({ clientId, onClose }) {
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();
    const fetchClient = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const response = await get(`/clients/${clientId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status !== 499) {
            setIsError(true);
          }
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
  }, [clientId]);

  const handleNewOutboundChat = async () => {
    setIsStartingChat(true);
    try {
      const response = await post('/chat/outbound', {
        clientId: client.id,
        message: '¡Hola! Nos comunicamos de ventas.',
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      navigate('/chat', { state: { conversationId: data.data.id } });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('No se pudo iniciar el chat', { description: 'Por favor, intenta de nuevo.' });
    } finally {
      setIsStartingChat(false);
    }
  };

  if (!clientId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} role="presentation" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Perfil del cliente"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <Eyebrow tone="muted">Clientes</Eyebrow>
            <h2 className="mt-0.5 text-sm font-semibold text-fg">Perfil del cliente</h2>
          </div>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner size={20} />
            </div>
          ) : isError ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-center text-sm text-danger" role="alert">
              No se pudo cargar el perfil del cliente.
            </div>
          ) : client && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={client.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-fg">{client.name || 'Sin nombre'}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-fg-muted">
                      <Phone size={12} aria-hidden />
                      <span className="tnum font-mono text-xs">{client.phoneNumber}</span>
                    </div>
                  </div>
                </div>

                {(client.cartData?.rfc || client.cartData?.items?.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {client.cartData?.rfc && <Badge tone="neutral">RFC {client.cartData.rfc}</Badge>}
                    {client.cartData?.items?.length > 0 && (
                      <Badge tone="success">
                        <ShoppingCart size={11} aria-hidden />
                        {client.cartData.items.length} artículos en carrito
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  variant="primary"
                  icon={MessageSquare}
                  loading={isStartingChat}
                  onClick={handleNewOutboundChat}
                  className="mt-4 w-full"
                >
                  Nuevo chat saliente
                </Button>
              </div>

              <section aria-label="Historial de interacciones">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={12} className="text-fg-subtle" aria-hidden />
                  <Eyebrow tone="muted">Historial de interacciones</Eyebrow>
                </div>

                {client.conversations && client.conversations.length > 0 ? (
                  <ol className="space-y-3">
                    {client.conversations.map((conv, i) => (
                      <li key={conv.id} className="relative pl-6">
                        {i !== client.conversations.length - 1 && (
                          <span className="absolute left-[5px] top-5 -bottom-3 w-px bg-border" aria-hidden />
                        )}
                        <span
                          className={cn('absolute left-0 top-2.5 h-[11px] w-[11px] rounded-full border-2 border-surface', conv.isOutbound ? 'bg-accent' : 'bg-fg-subtle')}
                          title={conv.isOutbound ? 'Saliente' : 'Entrante'}
                          aria-hidden
                        />

                        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge tone={conv.isOutbound ? 'accent' : 'neutral'}>{conv.isOutbound ? 'Saliente' : 'Entrante'}</Badge>
                              <StatusPill status={conv.status} />
                            </div>
                            <span className="tnum shrink-0 font-mono text-[10px] text-fg-subtle">{formatDate(conv.createdAt)}</span>
                          </div>

                          <p className="mt-2 text-[13px] text-fg-muted">
                            Atendió <span className="font-medium text-fg">{conv.vendor?.name || 'Asistente IA'}</span>
                          </p>

                          {conv.messages && conv.messages.length > 0 && (
                            <p className="mt-2 line-clamp-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg-muted">
                              {conv.messages[0].content}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState compact icon={MessageSquare} title="Sin interacciones" description="No hay conversaciones registradas con este cliente." />
                )}
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
