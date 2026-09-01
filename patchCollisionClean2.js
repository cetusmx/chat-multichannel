const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

const regex = /onChange=\{\(e\) => setScheduledAt\(e\.target\.value\)\}[\s\S]*?className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none \[color-scheme:dark\]"[\s\S]*?disabled=\{isPatching\}\s*\/>/m;

const replacement = `onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none [color-scheme:dark]"
                    disabled={isPatching}
                  />
                  {hasCollision && (
                    <div className="mt-3 text-xs text-amber-400 bg-amber-900/30 p-2.5 rounded border border-amber-500/30 flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <p>Ya tienes otra conversación programada para este mismo día y hora.</p>
                    </div>
                  )}`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
  console.log('Successfully patched collision warning');
} else {
  console.log('REGEX FAILED!');
}
