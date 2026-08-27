const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const target = `                    if (conversation.vendorId) ioEvent = ioEvent.to(\`vendor_\${conversation.vendorId}\`);
                    ioEvent.emit('conversation_updated', conversation);`;

const replacement = `                    if (conversation.vendorId) ioEvent = ioEvent.to(\`vendor_\${conversation.vendorId}\`);
                    ioEvent.emit('conversation_updated', conversation);
                    if (conversation._footprint) {
                       ioEvent.emit('new_message', conversation._footprint);
                    }`;

code = code.replace(target, replacement);
fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
console.log('Fixed WA emit');
