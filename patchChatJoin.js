const fs = require('fs');
const filepath = 'mobile/src/screens/ChatDetailScreen.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const hook_old = /useEffect\(\(\) => \{\s*if \(chatId\) \{\s*useChatStore\.setState\(\{ currentConversationId: chatId \}\);\s*clearUnreadCount\(chatId\);\s*\}\s*return \(\) => \{\s*useChatStore\.setState\(\{ currentConversationId: null \}\);\s*\};\s*\}, \[chatId, clearUnreadCount\]\);/m;

const hook_new = `const globalSocket = useChatStore((state) => state.socket);
  useEffect(() => {
    if (chatId) {
      useChatStore.setState({ currentConversationId: chatId });
      clearUnreadCount(chatId);
      if (globalSocket) {
        globalSocket.emit('join:conversation', chatId);
      }
    }
    return () => {
      useChatStore.setState({ currentConversationId: null });
      if (globalSocket) {
        globalSocket.emit('leave:conversation', chatId);
      }
    };
  }, [chatId, clearUnreadCount, globalSocket]);`;

if (hook_old.test(code)) {
    code = code.replace(hook_old, hook_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched ChatDetailScreen socket join again.');
} else {
    console.log('Could not find match in ChatDetailScreen.');
}
