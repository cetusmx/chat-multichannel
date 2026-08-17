import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';
import { 
  ChevronLeft, MessageSquare, ShoppingCart, User, 
  Phone, CheckCircle, ArrowRight, Clock, Search,
  Paperclip, Image as ImageIcon
} from 'lucide-react';
import SecureMedia from '../components/SecureMedia';

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    
    const fetchClient = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const response = await get(`/clients/${id}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status !== 499) setIsError(true);
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
  }, [id]);

  const handleNewOutboundChat = () => {
    navigate('/chat', { state: { draftClient: client } });
  };

  // Filter conversations and messages based on searchQuery
  const filteredConversations = useMemo(() => {
    if (!client?.conversations) return [];
    if (!searchQuery.trim()) return client.conversations;

    const query = searchQuery.toLowerCase();
    
    return client.conversations.map(conv => {
      // Filter messages that match the query
      const matchingMessages = conv.messages?.filter(m => 
        m.content.toLowerCase().includes(query)
      ) || [];
      
      // If the conversation metadata itself matches or if it has matching messages
      const matchesMeta = 
        conv.status.toLowerCase().includes(query) ||
        (conv.vendor?.name || '').toLowerCase().includes(query);

      if (matchesMeta || matchingMessages.length > 0) {
        return {
          ...conv,
          // Show matching messages, or fallback to the most recent one if we only matched metadata
          displayMessages: matchingMessages.length > 0 
            ? matchingMessages 
            : conv.messages?.slice(0, 1) || []
        };
      }
      return null;
    }).filter(Boolean);
  }, [client, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="animate-spin rounded-full h-12 w-12 border-b-2 border-sales-cyan-500" />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/clients')} className="flex items-center text-gray-400 hover:text-white mb-6">
          <ChevronLeft className="w-5 h-5 mr-1" /> Volver al Directorio
        </button>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
          Ocurrió un error al cargar el expediente del cliente.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sales-slate-900 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/clients')} 
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-sales-cyan-400" />
            Expediente del Cliente
          </h1>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* Left Panel (30%) - Vital Signs */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col gap-6 bg-white/[0.02] shrink-0 overflow-y-auto custom-scrollbar">
          
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sales-cyan-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg shadow-cyan-500/20">
              {client.name ? client.name.charAt(0).toUpperCase() : '?'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{client.name || 'Sin Nombre'}</h2>
            <p className="text-gray-400 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-sm">
              <Phone className="w-4 h-4" />
              {client.phoneNumber}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Datos Financieros</h3>
            
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">RFC</span>
                <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-sm">
                  {client.cartData?.rfc || 'N/D'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Compras Exitosas</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {client.conversations?.filter(c => c.status === 'CLOSED_WON').length || 0}
                </span>
              </div>
            </div>

            {(() => {
              const shipping = client.cartData?.shippingAddress;
              const billing = client.cartData?.billingAddress;
              if (!shipping && !billing) return null;
              
              return (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mt-4">
                  <h4 className="text-gray-400 font-medium text-xs uppercase tracking-wider mb-2">Domicilios</h4>
                  {shipping && (
                    <div>
                      <span className="text-gray-500 text-xs block mb-1">Envío</span>
                      <span className="text-gray-300 text-sm leading-relaxed block">{shipping}</span>
                    </div>
                  )}
                  {billing && (
                    <div className="pt-2">
                      <span className="text-gray-500 text-xs block mb-1">Fiscal</span>
                      <span className="text-gray-300 text-sm leading-relaxed block">{billing}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="mt-auto pt-6">
            <button
              onClick={handleNewOutboundChat}
              disabled={isStartingChat}
              className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isStartingChat ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
              Nuevo Chat Saliente
            </button>
          </div>
        </div>

        {/* Right Panel (70%) - Timeline and Search */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
          
          {/* Search Bar */}
          <div className="p-6 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar en el historial de chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-sales-cyan-500 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Timeline Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
            <div className="space-y-6">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv, idx) => {
                  const msgsToDisplay = conv.displayMessages || conv.messages || [];
                  const isWon = conv.status === 'CLOSED_WON';
                  const hasPurchaseEvidence = isWon || msgsToDisplay.some(m => m.content.toLowerCase().includes('carrito') || m.content.toLowerCase().includes('compra'));

                  return (
                    <div key={conv.id} className="relative flex group">
                      
                      {/* Vertical Line */}
                      {idx !== filteredConversations.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-white/10 group-hover:bg-white/20 transition-colors" />
                      )}
                      
                      {/* Timeline Dot */}
                      <div className="shrink-0 mt-1 mr-6 relative z-10">
                        <div className={`w-8 h-8 rounded-full border-4 border-sales-slate-900 flex items-center justify-center shadow-lg ${conv.isOutbound ? 'bg-orange-500 shadow-orange-500/20' : 'bg-sales-cyan-500 shadow-cyan-500/20'}`}>
                          {conv.isOutbound ? (
                            <ArrowRight className="w-3 h-3 text-white transform -rotate-45" />
                          ) : (
                            <ArrowRight className="w-3 h-3 text-white transform rotate-135" />
                          )}
                        </div>
                      </div>

                      {/* Split Card */}
                      <div className="flex-1 bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl overflow-hidden transition-colors flex flex-col md:flex-row shadow-xl">
                        
                        {/* Left Side: Metadata & Messages */}
                        <div className={`flex-1 p-5 ${hasPurchaseEvidence ? 'border-b md:border-b-0 md:border-r border-white/5' : ''}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className={`text-xs font-bold px-2 py-1 rounded-md tracking-wide ${conv.isOutbound ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-sales-cyan-500/20 text-sales-cyan-400 border border-cyan-500/30'}`}>
                                {conv.isOutbound ? 'SALIENTE' : 'ENTRANTE'}
                              </span>
                              <span className="text-xs bg-white/10 border border-white/10 px-2 py-1 rounded-md text-gray-300">
                                {conv.status}
                              </span>
                              {isWon && (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">
                                  <CheckCircle className="w-3 h-3" /> VENTA CERRADA
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap ml-2">
                              <Clock className="w-3 h-3" />
                              {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(conv.createdAt))}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-300 flex items-center gap-1.5 mb-4">
                            <User className="w-4 h-4 text-gray-500" />
                            Atendido por: <span className="font-medium text-white">{conv.vendor?.name || 'Bot (IA)'}</span>
                          </div>
                          
                          {/* Full Chat History */}
                          <div className="space-y-3 mt-2 max-h-96 overflow-y-auto custom-scrollbar pr-2 pb-2">
                            {msgsToDisplay.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(msg => {
                              // Highlight search term if present
                              const content = msg.content;
                              let displayContent = content;
                              if (searchQuery) {
                                const parts = content.split(new RegExp(`(${searchQuery})`, 'gi'));
                                displayContent = parts.map((part, i) => 
                                  part.toLowerCase() === searchQuery.toLowerCase() ? 
                                  <mark key={i} className="bg-sales-cyan-500/40 text-white rounded px-0.5">{part}</mark> : part
                                );
                              }

                              const isClient = msg.senderType === 'CLIENT';

                              return (
                                <div key={msg.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                                  <span className="text-[10px] text-gray-500 mb-1 ml-1 mr-1">
                                    {isClient ? 'Cliente' : 'Asesor / Bot'} • {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(new Date(msg.createdAt))}
                                  </span>
                                  <div className={`text-sm p-3 rounded-2xl max-w-[85%] border relative group/msg ${
                                    isClient 
                                      ? 'bg-black/30 border-white/5 rounded-tl-sm' 
                                      : 'bg-sales-cyan-900/20 border-sales-cyan-500/20 rounded-tr-sm text-sales-cyan-50'
                                  }`}>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="flex flex-col gap-2 mb-2">
                                        {msg.attachments.map((att, i) => (
                                          <SecureMedia
                                            key={i}
                                            url={att.url}
                                            type={att.type}
                                            fallbackText={att.name}
                                            className="w-full"
                                          />
                                        ))}
                                      </div>
                                    )}
                                    {displayContent && (
                                      <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {displayContent}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {msgsToDisplay.length === 0 && (
                              <p className="text-sm text-gray-500 italic">No hay mensajes legibles.</p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Virtual Cart (Visual representation of purchase) */}
                        {hasPurchaseEvidence && (
                          <div className="w-full md:w-64 bg-black/20 p-5 flex flex-col justify-center relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute -right-8 -bottom-8 opacity-5">
                              <ShoppingCart className="w-32 h-32 text-emerald-500" />
                            </div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <ShoppingCart className={`w-5 h-5 ${isWon ? 'text-emerald-400' : 'text-gray-400'}`} />
                                <h4 className={`font-medium text-sm ${isWon ? 'text-emerald-400' : 'text-gray-400'}`}>
                                  Evidencia de Carrito
                                </h4>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {isWon 
                                  ? "Esta conversación terminó en una venta concreta. El carrito asociado fue procesado y guardado en el expediente." 
                                  : "Se detectó actividad de carrito o cotización en el texto de esta conversación."}
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
                                  <div className="mt-4 pt-4 border-t border-white/10 text-xs">
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1 mb-2 space-y-2">
                                      {items.map((item, idx) => {
                                        const name = item.descripcion || item.clave || item.name || 'Producto';
                                        const quantity = item.cantidad || item.quantity || 1;
                                        const price = item.precio || item.precio_unitario || item.price || 0;
                                        return (
                                          <div key={idx} className="flex justify-between items-start text-gray-300">
                                            <span className="pr-2 leading-tight">
                                              <span className="font-medium">{quantity}x</span> {name}
                                            </span>
                                            <span className="text-white whitespace-nowrap">${(price * quantity).toLocaleString()}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex justify-between items-center text-gray-300 pt-2 border-t border-white/5">
                                      <span className="font-medium">Total Final Aprox.</span>
                                      <span className="text-emerald-400 font-bold font-mono text-sm">
                                        {total > 0 ? `$${total.toLocaleString()}` : '---'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Search className="w-8 h-8 mb-3 opacity-20" />
                  <p>No se encontraron conversaciones que coincidan con la búsqueda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
