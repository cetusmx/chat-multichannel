import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ShoppingCart, Clock, User, Phone, CheckCircle, ArrowRight } from 'lucide-react';
import { get, post } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

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
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status !== 499) { // ignore aborts
             setIsError(true);
          }
          return;
        }
        const data = await response.json();
        setClient(data.data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error fetching client details:", error);
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
        message: '¡Hola! Nos comunicamos de ventas.'
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      navigate('/chat', { state: { conversationId: data.data.id } });
    } catch (error) {
      console.error("Error starting chat:", error);
      alert('Error al iniciar el chat. Por favor, intenta de nuevo.');
    } finally {
      setIsStartingChat(false);
    }
  };

  if (!clientId) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${clientId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-0 right-0 h-full bg-sales-slate-900 border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col w-full max-w-md ${clientId ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-sales-cyan-400" />
            Perfil del Cliente
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-sales-cyan-500"></span>
            </div>
          ) : isError ? (
            <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-center">
              No se pudo cargar el perfil del cliente.
            </div>
          ) : client && (
            <>
              {/* Header Info */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{client.name || 'Sin Nombre'}</h3>
                  <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-sm">{client.phoneNumber}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {client.cartData?.rfc && (
                    <span className="px-2 py-1 bg-sales-cyan-900/30 border border-sales-cyan-500/30 text-sales-cyan-300 text-xs rounded-md font-medium">
                      RFC: {client.cartData.rfc}
                    </span>
                  )}
                  {client.cartData?.items?.length > 0 && (
                    <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-xs rounded-md font-medium flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      {client.cartData.items.length} artículos en carrito
                    </span>
                  )}
                </div>

                <button
                  onClick={handleNewOutboundChat}
                  disabled={isStartingChat}
                  className="mt-2 w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-medium py-2 rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isStartingChat ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  Nuevo Chat Saliente
                </button>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Historial de Interacciones
                </h4>
                
                <div className="space-y-4 pl-2">
                  {client.conversations && client.conversations.length > 0 ? (
                    client.conversations.map((conv, i) => (
                      <div key={conv.id} className="relative pl-6">
                        {/* Timeline line */}
                        {i !== client.conversations.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-white/10" />
                        )}
                        
                        {/* Timeline node */}
                        <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-sales-slate-900 flex items-center justify-center ${conv.isOutbound ? 'bg-orange-500' : 'bg-emerald-500'}`} title={conv.isOutbound ? 'Saliente' : 'Entrante'} />
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${conv.isOutbound ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {conv.isOutbound ? 'SALIENTE' : 'ENTRANTE'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Intl.DateTimeFormat('es-MX', { 
                                dateStyle: 'short', 
                                timeStyle: 'short' 
                              }).format(new Date(conv.createdAt))}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-300 flex items-center gap-1.5">
                            <span className="font-medium text-white">{conv.vendor?.name || 'Bot'}</span>
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{conv.status}</span>
                            {conv.status === 'CLOSED_WON' && (
                              <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" title="Venta Concretada" />
                            )}
                          </div>
                          
                          {conv.messages && conv.messages.length > 0 && (
                            <div className="text-xs text-gray-400 bg-black/20 p-2 rounded italic line-clamp-2 mt-1 border border-white/5">
                              "{conv.messages[0].content}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay interacciones registradas.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
