const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ChatView.jsx', 'utf8');

const regex = /disabledInput=\{\['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'\]\.includes\(activeConv\?\.status\)\}/;
const replacement = `disabledInput={['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'].includes(activeConv?.status)}
                  conversationStatus={activeConv?.status}
                  vendorId={activeConv?.vendorId}`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/pages/ChatView.jsx', code);
console.log('Fixed ChatView.jsx props');
