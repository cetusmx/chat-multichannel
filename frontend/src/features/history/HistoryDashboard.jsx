import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, User, ChevronLeft, ChevronRight, XCircle, MessageSquare } from 'lucide-react';
import { get } from '../../services/api.js';

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

  const limit = 15;

  // Fetch vendors
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

  // Fetch history
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(vendor && { vendorId: vendor }),
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
    setLocalSearch('');

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

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white">Historial de Chats</h1>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar en todos los chats..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={18} />
            <input
              type="date"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <User className="text-slate-400" size={18} />
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={vendor}
              onChange={e => { setVendor(e.target.value); setPage(1); }}
            >
              <option value="">Todos los asesores</option>
              {vendors.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>{v.name || v.username || v.email}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Buscar
          </button>
        </form>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Asesor</th>
                <th className="px-6 py-4 font-medium">Estatus</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : historyData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                historyData.map((chat) => {
                  const date = new Date(chat.createdAt || chat.updatedAt || Date.now()).toLocaleString();
                  const clientName = chat.client?.name || chat.clientName || chat.contact?.name || chat.clientPhone || 'Desconocido';
                  const advisorName = chat.vendor?.name || chat.user?.name || chat.vendorName || 'No asignado';

                  let statusLabel = chat.status;
                  let statusColor = 'text-gray-400';
                  
                  switch(chat.status) {
                    case 'CLOSED_WON':
                      statusLabel = 'Venta Cerrada';
                      statusColor = 'text-emerald-400';
                      break;
                    case 'DISCARDED':
                      statusLabel = 'Descartado';
                      statusColor = 'text-rose-400';
                      break;
                    case 'CLOSED':
                    case 'CLOSED_INACTIVE':
                      statusLabel = 'Cerrado';
                      statusColor = 'text-slate-400';
                      break;
                  }

                  return (
                    <tr
                      key={chat.id || chat._id}
                      className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => openChat(chat)}
                    >
                      <td className="px-6 py-4 text-slate-300">{date}</td>
                      <td className="px-6 py-4 font-medium text-white">{clientName}</td>
                      <td className="px-6 py-4 text-slate-400">{advisorName}</td>
                      <td className={`px-6 py-4 font-medium ${statusColor}`}>
                        {statusLabel}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          Ver chat
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
            <div className="text-sm text-slate-400">
              Mostrando <span className="text-white font-medium">{(page - 1) * limit + 1}</span> a <span className="text-white font-medium">{Math.min(page * limit, total)}</span> de <span className="text-white font-medium">{total}</span> resultados
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-slate-300 px-2">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-sm" onClick={closePanel}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col gap-4 bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex-1 truncate">
                  Chat con {selectedChat?.client?.name || selectedChat?.clientName || 'Cliente'}
                </h2>
                <button onClick={closePanel} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar en esta conversación..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-10 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                />
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
              {selectedChat?.messages?.length > 0 ? (
                selectedChat.messages.map((msg, idx) => {
                  const isClient = msg.senderType === 'CLIENT';
                  const textContent = msg.content || msg.text || '';

                  let senderLabel = 'Asesor';
                  if (isClient) senderLabel = 'Cliente';
                  else if (msg.senderType === 'IA') senderLabel = '🤖 Bot (IA)';
                  else if (msg.senderType === 'SYSTEM') senderLabel = '⚙️ Sistema';
                  else senderLabel = selectedChat?.vendor?.name ? `👨‍💼 ${selectedChat.vendor.name}` : '👨‍💼 Asesor';

                  return (
                    <div key={msg.id || msg._id || idx} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                      <span className="text-[10px] text-gray-500 mb-1 ml-1 mr-1">
                        {senderLabel} • {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <div className={`text-sm p-3 rounded-2xl max-w-[85%] border relative ${
                        isClient 
                          ? 'bg-black/30 border-white/5 rounded-tl-sm' 
                          : 'bg-sales-cyan-900/20 border-sales-cyan-500/20 rounded-tr-sm text-sales-cyan-50'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">
                          {highlightText(textContent, localSearch)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <MessageSquare size={48} className="opacity-20" />
                  <p className="text-sm text-center">No hay mensajes disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
