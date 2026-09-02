const fs = require('fs');
const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const dl_old = /const handleDownloadPDF = async \(\) => \{\s*Toast\.show\(\{ type: 'info', text1: 'Cotización PDF', text2: 'Próximamente disponible en la app.' \}\);\s*\};/m;

const dl_new = `const handleDownloadPDF = async () => {
    try {
      const reqBody = {
        conversationId: chat.id,
        client: {
          name: tempBilling.razonSocial || clientName || '',
          chatName: clientName || '',
          rfc: tempBilling.rfc || '',
          billingAddress: tempBilling.billingAddress || '',
          address: tempAddress || '',
          phone: clientPhone || '',
        },
        cartItems: cartItems,
      };
      const res = await post('/chat/quote/generate', reqBody);
      if (res.ok) {
        Toast.show({ type: 'success', text1: 'Cotización generada', text2: 'Se ha enviado el PDF al cliente' });
        onClose();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar la cotización' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Fallo al conectar con el servidor' });
    }
  };`;

if (dl_old.test(code)) {
    code = code.replace(dl_old, dl_new);
    fs.writeFileSync(filepath, code);
    console.log('Patched handleDownloadPDF');
} else {
    console.log('Could not find match in CartModal for handleDownloadPDF.');
}
