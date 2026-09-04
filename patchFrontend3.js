const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Remove getSearchSnippet
const snippet_func = /const getSearchSnippet = \(\s*text, term\s*\) => \{[\s\S]*?return highlightText\(snippet, term\);\s*\};\s*/;
if (snippet_func.test(code)) {
    code = code.replace(snippet_func, '');
    console.log('Removed getSearchSnippet.');
}

// 2. Change the <thead> to remove the Asesor column
const thead = /<th className="px-6 py-4 text-left font-medium text-slate-400 uppercase tracking-wider">\s*Cliente\s*<\/th>\s*<th className="px-6 py-4 text-left font-medium text-slate-400 uppercase tracking-wider">\s*Asesor\s*<\/th>/;
const new_thead = `<th className="px-6 py-4 text-left font-medium text-slate-400 uppercase tracking-wider">
                    Cliente / Asesor
                  </th>`;
if (thead.test(code)) {
    code = code.replace(thead, new_thead);
    console.log('Patched thead.');
}

// 3. Change the <tbody> row to merge columns and use the backend snippet
const tbody = /<td className="px-6 py-4">\s*<div className="font-medium text-white">\{clientName\}<\/div>\s*\{searchTerm && chat\.messages && chat\.messages\.length > 0 && \(\s*<div className="text-xs text-slate-400 italic mt-1 line-clamp-2 max-w-md">\s*💬 \{getSearchSnippet\(chat\.messages\[0\]\.content \|\| chat\.messages\[0\]\.text, searchTerm\)\}\s*<\/div>\s*\)\}\s*<\/td>\s*<td className="px-6 py-4 text-slate-400">\{advisorName\}<\/td>/;

const new_tbody = `<td className="px-6 py-4">
                        <div className="font-medium text-white flex items-center gap-2">
                          <span>{clientName}</span>
                          <span className="text-xs text-slate-500 font-normal">({advisorName})</span>
                        </div>
                        {searchTerm && chat.messages && chat.messages.length > 0 && (
                          <div className="text-xs text-slate-400 italic mt-1 line-clamp-2 max-w-md">
                            💬 {highlightText(chat.messages[0].searchSnippet || chat.messages[0].content || chat.messages[0].text, searchTerm)}
                          </div>
                        )}
                      </td>`;

if (tbody.test(code)) {
    code = code.replace(tbody, new_tbody);
    console.log('Patched tbody row.');
} else {
    console.log('Could not find match for tbody row.');
}

fs.writeFileSync(filepath, code);
