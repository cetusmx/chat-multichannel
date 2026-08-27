const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ChatView.jsx', 'utf8');

const regex = /if \(\['ON_HOLD', 'WAITING_CUSTOMER', 'SCHEDULED'\]\.includes\(status\)\) \{[\s\S]*?<span className="w-2 h-2 rounded-full bg-sales-amber-400 animate-pulse"><\/span>\s*Esperando al Cliente\s*<\/div>/;

const replacement = `if (['ON_HOLD', 'WAITING_CUSTOMER', 'SCHEDULED'].includes(status)) {
    let label = '';
    let colorClass = '';
    let dotClass = '';
    
    if (status === 'WAITING_CUSTOMER') {
      label = 'Esperando al Cliente';
      colorClass = 'bg-sales-amber-500/20 border-sales-amber-500 text-sales-amber-400';
      dotClass = 'bg-sales-amber-400';
    } else if (status === 'ON_HOLD') {
      label = 'En Espera (Pausado)';
      colorClass = 'bg-sales-purple-500/20 border-sales-purple-500 text-sales-purple-400';
      dotClass = 'bg-sales-purple-400';
    } else {
      label = 'Programado';
      colorClass = 'bg-sales-cyan-500/20 border-sales-cyan-500 text-sales-cyan-400';
      dotClass = 'bg-sales-cyan-400';
    }

    return (
      <div className="flex items-center gap-2">
        <div className={\`border px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 \${colorClass}\`}>
          <span className={\`w-2 h-2 rounded-full animate-pulse \${dotClass}\`}></span>
          {label}
        </div>`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('frontend/src/pages/ChatView.jsx', code);
  console.log('Fixed ChatView labels');
} else {
  console.log('Regex not matched in ChatView');
}
