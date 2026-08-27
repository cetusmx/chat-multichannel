const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useChatStore.js', 'utf8');

const regex = /newSocket\.on\('new_message', \(msg\) => \{[\s\S]*?if \(!isActiveMain && !isActiveFocus && !isMyMessage\) \{/g;
const replacement = `newSocket.on('new_message', (msg) => {
      let shouldClearRead = false;
      set((state) => {
        let nextMessages = state.messages;
        let requiresFetch = false;

        let nextUnreadCounts = { ...state.unreadCounts };
        const uiState = useUIStore.getState();
        const isActiveMain = state.currentConversationId === msg.conversationId;
        const isActiveFocus = uiState.focusedChatIds.includes(msg.conversationId);
        const isMyMessage = ['VENDOR', 'SYSTEM', 'COORDINATOR', 'ADMIN'].includes(msg.senderType);

        if (!isActiveMain && !isActiveFocus && !isMyMessage) {`;

code = code.replace(regex, replacement);

const regex2 = /return \{ messages: nextMessages, conversations: nextConversations, unreadCounts: nextUnreadCounts \};\s*\}\);\s*\}\);/g;
const replacement2 = `return { messages: nextMessages, conversations: nextConversations, unreadCounts: nextUnreadCounts };
      });

      if (shouldClearRead) {
        setTimeout(() => get().clearUnreadCount(msg.conversationId), 100);
      }
    });`;

code = code.replace(regex2, replacement2);

const regex3 = /if \(!isActiveMain && !isActiveFocus && !isMyMessage\) \{\s*nextUnreadCounts\[msg\.conversationId\] = \(nextUnreadCounts\[msg\.conversationId\] \|\| 0\) \+ 1;\s*\}/g;
const replacement3 = `if (!isActiveMain && !isActiveFocus && !isMyMessage) {
          nextUnreadCounts[msg.conversationId] = (nextUnreadCounts[msg.conversationId] || 0) + 1;
        } else if (!isMyMessage) {
          shouldClearRead = true;
        }`;

code = code.replace(regex3, replacement3);

fs.writeFileSync('frontend/src/stores/useChatStore.js', code);
console.log('Fixed useChatStore mark_as_read');
