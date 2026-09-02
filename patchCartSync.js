const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const sync_old = /useEffect\(\(\) => \{\s*if \(visible\) \{\s*setTempAddress\(shippingAddress \|\| ''\);\s*setTempBilling\(\{\s*razonSocial: razonSocial \|\| '',\s*rfc: rfc \|\| '',\s*billingAddress: billingAddress \|\| ''\s*\}\);\s*setIsEditingAddress\(false\);\s*setIsEditingBilling\(false\);\s*\}\s*\}, \[visible\]\);/m;

const sync_new = `useEffect(() => {
    if (visible) {
      setTempAddress(shippingAddress || '');
      setTempBilling({
        razonSocial: razonSocial || '',
        rfc: rfc || '',
        billingAddress: billingAddress || ''
      });
      setIsEditingAddress(false);
      setIsEditingBilling(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !isEditingBilling) {
      setTempBilling(prev => ({
        razonSocial: razonSocial || prev.razonSocial,
        rfc: rfc || prev.rfc,
        billingAddress: billingAddress || prev.billingAddress
      }));
    }
  }, [razonSocial, rfc, billingAddress, isEditingBilling, visible]);`;

if (sync_old.test(code)) {
    code = code.replace(sync_old, sync_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched CartModal sync effect.');
} else {
    console.log('Could not find match in CartModal.');
}
