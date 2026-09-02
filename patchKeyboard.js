const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

code = code.replace(
  /<KeyboardAvoidingView behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\} style=\{styles\.modalContainer\}>/g,
  "<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>"
);

fs.writeFileSync(filepath, code);
console.log("Patched KeyboardAvoidingView behavior.");
