const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_total = "const totalPages = Math.ceil(total / limit) || 1;";
const new_total = `const getSearchSnippet = (text, term) => {
    if (!text || !term) return '';
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + term.length + 40);
    let snippet = text.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return highlightText(snippet, term);
  };

  const totalPages = Math.ceil(total / limit) || 1;`;

if (code.includes(old_total)) {
    code = code.replace(old_total, new_total);
    fs.writeFileSync(filepath, code);
    console.log('Patched getSearchSnippet.');
} else {
    console.log('Could not find match for getSearchSnippet.');
}
