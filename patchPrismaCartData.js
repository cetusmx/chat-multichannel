const fs = require('fs');
let code = fs.readFileSync('backend/src/services/whatsapp.service.js', 'utf8');

const buggyUpdateStr = `const updatedCartJson = JSON.stringify(currentCart);
                            await prisma.client.update({
                              where: { id: client.id },
                              data: { cart: updatedCartJson }
                            });`;

const fixUpdateStr = `await prisma.client.update({
                              where: { id: client.id },
                              data: { cartData: currentCart }
                            });`;

if (code.includes(buggyUpdateStr)) {
  code = code.replace(buggyUpdateStr, fixUpdateStr);
  fs.writeFileSync('backend/src/services/whatsapp.service.js', code);
  console.log('Fixed Prisma update');
} else {
  console.log('Buggy string not found');
}
