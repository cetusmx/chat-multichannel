const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const suggest_product_old = /const handleSuggestProduct = \(product\) => \{\s*const desc = product\.DESC_ECOMM \|\| product\.DESCR \|\| product\.NOMBRE;\s*const priceNet = \(\(product\.PRECIO \|\| 0\) \* 1\.16\)\.toFixed\(2\);\s*const msg = `Tengo esta opci[óo]n:\\n\*\$\{product\.CVE_ART\}\* - \$\{desc\}\\nPrecio: \$\$\{priceNet\} Neto \(IVA Incluido\)`;\s*sendMessage\(msg, false\);\s*onClose\(\);[\s\S]*?\};/m;

const suggest_product_new = `const handleSuggestProduct = (product) => {
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    const linea = product.LIN_PROD || '';
    const imageUrl = \`https://sistemahidraulico.mx/Perfiles/\${linea}.jpg\`;

    const metadata = {
      clave: product.CVE_ART,
      description: desc,
      priceNet: priceNet,
      imageUrl: imageUrl,
      rawProduct: product
    };

    sendMessage('', false, 'PRODUCT_CARD', metadata);
    onClose();
  };`;

if(suggest_product_old.test(code)) {
    code = code.replace(suggest_product_old, suggest_product_new);
    fs.writeFileSync(filepath, code);
    console.log("Patched handleSuggestProduct successfully.");
} else {
    console.log("Could not find match for handleSuggestProduct.");
}
