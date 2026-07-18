import { useEffect } from 'react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import useUIStore from '../../../stores/useUIStore';
import ChatList from './ChatList';
import FocusPanel from './FocusPanel';
import { motion } from 'framer-motion';

export default function CoordinatorDashboard() {
  const user = useAuthStore(s => s.user);
  const { socket, conversations, fetchConversations } = useChatStore();
  const coordinatorViewMode = useUIStore(s => s.coordinatorViewMode);
  const focusedChatIds = useUIStore(s => s.focusedChatIds);
  const toggleFocusedChat = useUIStore(s => s.toggleFocusedChat);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (socket && user?.tenantId) {
      socket.emit('join:tenant_coordinators', user.tenantId);
      return () => {
        socket.emit('leave:tenant_coordinators', user.tenantId);
      };
    }
  }, [socket, user]);

  return (
    <div className="flex relative overflow-hidden w-full h-full bg-sales-slate-900 text-sales-slate-100 rounded-lg border border-sales-slate-800 shadow-xl">
      {coordinatorViewMode === 'preview' ? (
        <motion.div 
          layout
          className="w-full h-full overflow-y-auto p-4"
        >
          <div className="flex items-center justify-between mb-4 px-4">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-sales-slate-100 to-sales-slate-300 bg-clip-text text-transparent">
              Vista Global
            </h2>
            <div className="text-sm text-sales-slate-400">
              {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'} activos
            </div>
          </div>
          <ChatList 
            conversations={conversations} 
            currentConversationIds={focusedChatIds} 
            onSelect={toggleFocusedChat}
            layout="grid" 
          />
        </motion.div>
      ) : (
        <motion.div 
          layout
          className="flex w-full h-full"
        >
          {/* Left panel: narrow list */}
          <div className="flex flex-col shrink-0 z-10 w-80 h-full bg-sales-slate-900/40 border-r border-sales-slate-800 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between p-4 bg-sales-slate-900/60 border-b border-sales-slate-800">
              <h2 className="text-lg font-medium text-sales-slate-100">Chats Activos</h2>
              <button 
                onClick={() => useUIStore.getState().setCoordinatorViewMode('preview')}
                className="text-xs px-3 py-1.5 bg-sales-slate-800/80 text-sales-slate-300 rounded-md hover:text-white hover:bg-sales-slate-700 transition-colors shadow-sm"
              >
                Volver a Grid
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ChatList 
                conversations={conversations} 
                currentConversationIds={focusedChatIds} 
                onSelect={toggleFocusedChat}
                layout="list" 
              />
            </div>
          </div>
          {/* Right panel: Focus Panel */}
          <div className="flex-1 h-full min-w-0 overflow-hidden bg-[#0A0F1A]">
            <FocusPanel />
          </div>
        </motion.div>
      )}
    </div>
  );
}
