const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ChatView.jsx', 'utf8');

let newCode = code.replace(/w-14 h-14/g, 'w-12 h-12');
newCode = newCode.replace(/font-black/g, 'font-normal');

if (code !== newCode) {
  fs.writeFileSync('frontend/src/pages/ChatView.jsx', newCode);
  console.log('Fixed cart button size and font weight');
} else {
  console.log('No changes made to ChatView.jsx');
}
