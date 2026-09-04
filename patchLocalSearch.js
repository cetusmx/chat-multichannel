const fs = require('fs');
const filepath = 'frontend/src/features/history/HistoryDashboard.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_openchat = /setLocalSearch\(''\);/;
const new_openchat = "setLocalSearch(searchTerm);";

if (old_openchat.test(code)) {
    code = code.replace(old_openchat, new_openchat);
    fs.writeFileSync(filepath, code);
    console.log('Patched setLocalSearch.');
} else {
    console.log('Could not find setLocalSearch match.');
}
