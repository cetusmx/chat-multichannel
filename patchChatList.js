const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatList.jsx', 'utf8');

const regex = /\{\(conv\.status === 'ON_HOLD' \|\| conv\.status === 'SCHEDULED' \|\| conv\.status === 'WAITING_CUSTOMER'\) && \([\s\S]*?\}\)/;

const replacement = `{conv.status === 'WAITING_CUSTOMER' && (
                <span
                  className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-amber-500/20 text-sales-amber-400 border border-sales-amber-500/30 text-[10px] font-bold uppercase tracking-wider"
                  title="Esperando al cliente"
                >
                  Esp. Cliente
                </span>
              )}
              {conv.status === 'ON_HOLD' && (
                <span
                  className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-purple-500/20 text-sales-purple-400 border border-sales-purple-500/30 text-[10px] font-bold uppercase tracking-wider"
                  title="Pausado / En Espera"
                >
                  En Espera
                </span>
              )}
              {conv.status === 'SCHEDULED' && (
                <span
                  className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-cyan-500/20 text-sales-cyan-400 border border-sales-cyan-500/30 text-[10px] font-bold uppercase tracking-wider"
                  title="Programado"
                >
                  Programado
                </span>
              )}`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('frontend/src/features/chat/components/ChatList.jsx', code);
  console.log('Fixed ChatList labels');
} else {
  console.log('Regex not matched in ChatList');
}
