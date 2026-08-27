const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const regex = /let itemsText = \(metadata\.items \|\| \[\]\)\.map\(i => `.*?`\)\.join\('.*?'\);/s;

const replacement = "let itemsText = (metadata.items || []).map(i => `▫️ ${i.cantidad}x *${i.clave}* - $${(i.precio * i.cantidad).toFixed(2)}`).join('\\n');";

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Fixed item text formatting in WhatsApp');
} else {
  console.log('Regex did not match');
}
