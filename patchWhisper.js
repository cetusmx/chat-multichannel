const fs = require('fs');
const filepath = 'mobile/src/components/ChatInput.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const send_old = /const draft = isWhisperMode \? `\/whisper \$\{trimmedText\}` : trimmedText;\s*setText\(''\); \/\/ Optimistic UX: clear instantly\s*setIsSending\(true\);\s*await onSendText\(draft\);/m;
const send_new = `setText(''); // Optimistic UX: clear instantly
      setIsSending(true);
      await onSendText(trimmedText, isWhisperMode);`;

if(send_old.test(code)) {
    code = code.replace(send_old, send_new);
    fs.writeFileSync(filepath, code);
    console.log("Patched ChatInput whisper mode.");
} else {
    console.log("Could not find match for ChatInput whisper mode.");
}
