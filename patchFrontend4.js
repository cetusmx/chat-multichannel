const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_thead = /<th className="px-6 py-4 font-medium">Cliente<\/th>\s*<th className="px-6 py-4 font-medium">Asesor<\/th>/;
const new_thead = `<th className="px-6 py-4 font-medium">Cliente / Asesor</th>`;

if (old_thead.test(code)) {
    code = code.replace(old_thead, new_thead);
    fs.writeFileSync(filepath, code);
    console.log('Patched thead.');
} else {
    console.log('Could not find match for thead.');
}
