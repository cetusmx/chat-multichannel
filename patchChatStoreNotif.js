const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useChatStore.js', 'utf8');

const regex = /newSocket\.on\('conversation_updated', \(conversation\) => \{\s*set\(\(state\) => \(\{\s*conversations: state\.conversations\.map\(c => c\.id === conversation\.id \? \{ \.\.\.c, \.\.\.conversation \} : c\),\s*\}\)\);\s*\}\);/g;

const replacement = `newSocket.on('conversation_updated', (conversation) => {
      set((state) => {
        const oldConv = state.conversations.find(c => c.id === conversation.id);
        
        // Notify if resumed from SCHEDULED
        if (oldConv && oldConv.status === 'SCHEDULED' && conversation.status === 'ACTIVE') {
          const clientName = oldConv.client?.name || oldConv.client?.phone || 'Cliente';
          useUIStore.getState().addNotification({
            title: 'Chat Reactivado',
            message: \`El seguimiento programado con \${clientName} ha llegado a su hora.\`,
            type: 'info',
            chatId: conversation.id
          });
        }

        return {
          conversations: state.conversations.map(c => c.id === conversation.id ? { ...c, ...conversation } : c),
        };
      });
    });`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/stores/useChatStore.js', code);
console.log('Fixed useChatStore notifications');
