const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

let regex = /export default function MessageList\(\{([^}]+)\}\) \{/;
code = code.replace(regex, (match, p1) => {
  return `export default function MessageList({${p1}, conversationStatus, vendorId }) {`;
});

const logicRegex = /const token = useAuthStore\(state => state\.token\);\s*const user = useAuthStore\(state => state\.user\);/;
const logicReplacement = `const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  
  const isInternalRestricted = !vendorId && ['ADMIN', 'COORDINATOR'].includes(user?.role);`;

code = code.replace(logicRegex, logicReplacement);

const btnRegex = /<button\s*type="button"\s*disabled=\{isUploading \|\| disabledInput\}\s*onClick=\{\(\) => setIsInternal\(!isInternal\)\}/;
const btnReplacement = `<button
              type="button"
              disabled={isUploading || disabledInput || isInternalRestricted}
              onClick={() => setIsInternal(!isInternal)}`;

code = code.replace(btnRegex, btnReplacement);

const titleRegex = /title=\{isInternal \? 'Comentario Interno' : 'Respuesta al Cliente'\}/;
const titleReplacement = `title={isInternalRestricted ? 'Asigna la conversación para enviar susurros' : (isInternal ? 'Comentario Interno' : 'Respuesta al Cliente')}`;

code = code.replace(titleRegex, titleReplacement);

const classRegex = /className=\{\`flex items-center justify-center p-2 rounded-lg transition-colors font-bold text-xs \$\{\s*isInternal\s*\?\s*'bg-sales-orange-500 text-white hover:bg-sales-orange-600'\s*:\s*'bg-sales-slate-800 text-sales-slate-400 hover:text-sales-slate-200 border border-sales-slate-700'\s*\}\`\}/;
const classReplacement = `className={\`flex items-center justify-center p-2 rounded-lg transition-colors font-bold text-xs \${
                isInternalRestricted ? 'opacity-50 cursor-not-allowed bg-sales-slate-800 text-sales-slate-500 border border-sales-slate-700' :
                isInternal
                  ? 'bg-sales-orange-500 text-white hover:bg-sales-orange-600'
                  : 'bg-sales-slate-800 text-sales-slate-400 hover:text-sales-slate-200 border border-sales-slate-700'
              }\`}`;

code = code.replace(classRegex, classReplacement);

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('Patched MessageList.jsx');
