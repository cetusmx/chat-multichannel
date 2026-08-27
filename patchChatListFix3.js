const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatList.jsx', 'utf8');

code = code.replace("</span>\n              )}}", "</span>\n              )}");
code = code.replace("</span>\r\n              )}}", "</span>\r\n              )}");

fs.writeFileSync('frontend/src/features/chat/components/ChatList.jsx', code);
console.log('Fixed manually');
