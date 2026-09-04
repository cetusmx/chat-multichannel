const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_td = /<td className="px-6 py-4 font-medium text-white">\{clientName\}<\/td>/;
const new_td = `<td className="px-6 py-4">
                        <div className="font-medium text-white">{clientName}</div>
                        {searchTerm && chat.messages && chat.messages.length > 0 && (
                          <div className="text-xs text-slate-400 italic mt-1 line-clamp-2 max-w-md">
                            💬 {getSearchSnippet(chat.messages[0].content || chat.messages[0].text, searchTerm)}
                          </div>
                        )}
                      </td>`;

if (old_td.test(code)) {
    code = code.replace(old_td, new_td);
    fs.writeFileSync(filepath, code);
    console.log('Patched table row.');
} else {
    console.log('Could not find match for table row.');
}
