const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

if (!code.includes('useChatStore')) {
  code = code.replace(/import ConfirmModal from '\.\.\/\.\.\/\.\.\/components\/ConfirmModal';/, "import ConfirmModal from '../../../components/ConfirmModal';\nimport useChatStore from '../../../stores/useChatStore';");
}

code = code.replace(/const modalRef = React\.useRef\(null\);/, `const modalRef = React.useRef(null);
  
  const conversations = useChatStore(state => state.conversations);
  const currentConvId = useChatStore(state => state.currentConversationId);
  const hasCollision = React.useMemo(() => {
    if (activeModal !== 'SCHEDULED' || !scheduledAt) return false;
    const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
    if (isNaN(year) || isNaN(hour)) return false;
    const selectedDate = new Date(year, month - 1, day, hour, minute).getTime();
    
    return conversations.some(c => {
      if (c.id === currentConvId) return false; // ignore self
      if (c.status !== 'SCHEDULED' || !c.scheduledAt) return false;
      const cTime = new Date(c.scheduledAt).getTime();
      return cTime === selectedDate;
    });
  }, [scheduledAt, activeModal, conversations, currentConvId]);`);

code = code.replace(/disabled=\{isPatching\}\s*\/>/m, `disabled={isPatching}
                  />
                  {hasCollision && (
                    <div className="mt-3 text-xs text-amber-400 bg-amber-900/30 p-2.5 rounded border border-amber-500/30 flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <p>Ya tienes otra conversación programada para este mismo día y hora.</p>
                    </div>
                  )}`);

fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
console.log('Fixed collision warning');
