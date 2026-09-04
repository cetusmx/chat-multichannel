const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_highlight = /const highlightText = \(\s*text, highlight\s*\) => \{[\s\S]*?return \(\s*<span>\s*\{parts\.map\(\(part, i\) =>\s*regex\.test\(part\) \?\s*\(\s*<mark key=\{i\} className="bg-yellow-300 text-black px-0\.5 rounded">\{part\}<\/mark>\s*\)\s*:\s*\(\s*<span key=\{i\}>\{part\}<\/span>\s*\),\s*\)\}\s*<\/span>\s*\);\s*\};/;

const new_highlight = `const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) {
      return <span>{text}</span>;
    }
    const escapedHighlight = highlight.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    const regex = new RegExp(\`(\${escapedHighlight})\`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  };`;

if (old_highlight.test(code)) {
    // using a function to avoid $& replacement issues
    code = code.replace(old_highlight, () => new_highlight);
    fs.writeFileSync(filepath, code);
    console.log('Patched highlightText safely.');
} else {
    console.log('Could not find match for highlightText.');
}
