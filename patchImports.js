const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const import_old = /import \{ get, patch, getSealMarketFamilias, searchSealMarketCatalog \} from '\.\.\/services\/api';/m;
const import_new = "import { get, post, patch, getSealMarketFamilias, searchSealMarketCatalog } from '../services/api';";

if (import_old.test(code)) {
    code = code.replace(import_old, import_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched CartModal imports to include post.');
} else {
    console.log('Could not find match in CartModal for imports.');
}
