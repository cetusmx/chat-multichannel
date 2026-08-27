const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

// The onClick async handlers both use `activeConversation`. Let's just do a global replace of `if (activeConversation && activeConversation.client) {` with `const conv = useChatStore.getState().conversations.find(c => c.id === conversationId);\nif (conv && conv.client) {`
// and then replace all `activeConversation.` with `conv.`

code = code.replace(
  /if\s*\(\s*activeConversation\s*&&\s*activeConversation\.client\s*\)\s*\{/g,
  'const conv = useChatStore.getState().conversations.find(c => c.id === conversationId);\n                            if (conv && conv.client) {'
);

code = code.replace(/activeConversation\.client/g, 'conv.client');

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('Fixed activeConversation reference.');
