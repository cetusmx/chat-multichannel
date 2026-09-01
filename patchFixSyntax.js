const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

// Remove the wrongly inserted collision warning from ConfirmModal
code = code.replace(/disabled=\{isPatching\}\s*\/>\s*\{hasCollision && \([\s\S]*?\}\)/, `disabled={isPatching}\n        />`);

// Re-insert it after the correct input (datetime-local)
// The input ends with disabled={isPatching} />
const inputTarget = `value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none [color-scheme:dark]"
                    disabled={isPatching}
                  />`;
const inputReplacement = `value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-sales-slate-800 border border-sales-slate-700 rounded p-2 text-white focus:border-sales-cyan-500 focus:outline-none [color-scheme:dark]"
                    disabled={isPatching}
                  />
                  {hasCollision && (
                    <div className="mt-3 text-xs text-amber-400 bg-amber-900/30 p-2.5 rounded border border-amber-500/30 flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <p>Ya tienes otra conversación programada para este mismo día y hora.</p>
                    </div>
                  )}`;

code = code.replace(inputTarget, inputReplacement);
fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
console.log('Fixed syntax error');
