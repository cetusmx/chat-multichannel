const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/MessageList.jsx', 'utf8');

code = code.replace(
  "const [text, setText] = useState('');",
  "const [text, setText] = useState('');\n  const [addToCartModal, setAddToCartModal] = useState(null);\n  const [cartQty, setCartQty] = useState(1);"
);

fs.writeFileSync('frontend/src/features/chat/components/MessageList.jsx', code);
console.log('State variables added successfully.');
