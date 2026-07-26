const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfGeneratorService {
  /**
   * Genera un PDF de cotización a partir de los datos del cliente y su carrito.
   */
  static generateQuote(clientData, cartItems, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);
        
        const primaryColor = '#000000';
        const secondaryColor = '#333333';
        const redColor = '#cc0000';
        
        // --- HEADER ---
        // Logo Placeholder
        doc.font('Helvetica-Bold').fontSize(36).fillColor('#1a5276').text('ASHM', 40, 40);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('ACEROS Y SISTEMAS HIDRAULICOS DE MEXICO', 40, 75);
        
        // Company Info (Center)
        doc.font('Helvetica-Bold').fontSize(9).text('ACEROS Y SISTEMAS HIDRAULICOS DE MEXICO', 200, 40, { width: 200, align: 'center' });
        doc.font('Helvetica').fontSize(8)
           .text('RFC ASH1310166V2\nMATIAS ROMERO 1143\nCOL. SAN CARLOS\nGUADALAJARA, JAL.\nC.P. 44460\nTel: (33) 1814-2223, 2224', 200, 52, { width: 200, align: 'center' });
           
        // Quote Number Box (Right)
        doc.roundedRect(420, 40, 150, 35, 5).stroke();
        doc.font('Helvetica-Bold').fontSize(12).text('COTIZACIÓN', 420, 45, { width: 150, align: 'center' });
        const folio = Math.floor(Math.random() * 90000) + 10000;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(redColor).text(`C ${folio}`, 420, 60, { width: 150, align: 'center' });
        doc.fillColor(primaryColor);
        
        // Date Box
        doc.roundedRect(420, 85, 150, 30, 5).stroke();
        const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.font('Helvetica-Bold').fontSize(9).text('Fecha:', 425, 95);
        doc.font('Helvetica').text(dateStr, 470, 95);
        
        // --- FACTURADO A (Client Details) ---
        doc.roundedRect(40, 125, 530, 80, 5).stroke();
        doc.font('Helvetica-Bold').fontSize(9).text('COTIZADO A:', 45, 130);
        
        doc.font('Helvetica').fontSize(9);
        doc.text(clientData.name || clientData.NOMBRE || 'Cliente General', 45, 145);
        
        if (clientData.address || clientData.CALLE) {
          const addr = clientData.address || `${clientData.CALLE} ${clientData.NUMEXT}, ${clientData.COLONIA}`;
          doc.text(addr, 45, 160);
          if (clientData.CODIGO) doc.text(`C.P. ${clientData.CODIGO}`, 45, 175);
        }
        if (clientData.RFC) doc.text(`RFC: ${clientData.RFC}`, 350, 175);
        
        // --- PAYMENT TERMS ---
        doc.roundedRect(40, 215, 250, 20, 5).stroke();
        doc.font('Helvetica-Bold').fontSize(9).text('Vigencia:', 45, 221);
        doc.font('Helvetica').text('15 días', 100, 221);
        
        // --- TABLE ---
        const tableTop = 250;
        doc.roundedRect(40, tableTop, 530, 20, 5).fillAndStroke('#f0f0f0', '#000000');
        doc.fillColor(primaryColor);
        
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Cant.', 45, tableTop + 5);
        doc.text('Uni.', 80, tableTop + 5);
        doc.text('Clave', 110, tableTop + 5);
        doc.text('Descripción', 180, tableTop + 5);
        doc.text('Valor uni.', 430, tableTop + 5);
        doc.text('Importe', 500, tableTop + 5);
        
        let y = tableTop + 25;
        let subtotal = 0;
        
        doc.font('Helvetica').fontSize(9);
        cartItems.forEach(item => {
          const cantidad = item.cantidad || 1;
          const precio = item.precio || 0;
          const importe = cantidad * precio;
          subtotal += importe;
          
          doc.text(cantidad.toString(), 45, y);
          doc.text('PZA', 80, y);
          doc.text(item.clave, 110, y, { width: 60 });
          
          const descHeight = doc.heightOfString(item.descripcion, { width: 240 });
          doc.text(item.descripcion, 180, y, { width: 240 });
          
          doc.text(precio.toFixed(2), 430, y);
          doc.text(importe.toFixed(2), 500, y);
          
          y += descHeight + 10;
        });
        
        // Draw bottom table boundary
        doc.roundedRect(40, tableTop + 20, 530, Math.max(y - tableTop - 20, 50), 5).stroke();
        
        // --- TOTALS ---
        y = Math.max(y + 20, tableTop + 90);
        
        // Bank Accounts (Left)
        doc.font('Helvetica-Bold').fontSize(9).text('Cuentas Bancarias:', 40, y);
        doc.font('Helvetica').fontSize(8)
           .text('BANCOMER\nCuenta: 0194674065\nCLABE: 012320001946740654', 40, y + 15)
           .text('BANAMEX\nCuenta: 2793917\nSuc. 7007', 200, y + 15);
           
        // Totals Box (Right)
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        doc.roundedRect(420, y, 150, 50, 5).stroke();
        
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Subtotal', 425, y + 5);
        doc.text('IVA', 425, y + 20);
        doc.text('TOTAL', 425, y + 35);
        
        doc.font('Helvetica').fontSize(9);
        doc.text(subtotal.toFixed(2), 500, y + 5, { width: 60, align: 'right' });
        doc.text(iva.toFixed(2), 500, y + 20, { width: 60, align: 'right' });
        doc.text(total.toFixed(2), 500, y + 35, { width: 60, align: 'right' });
        
        // Draw inner lines for totals box
        doc.moveTo(420, y + 17).lineTo(570, y + 17).stroke();
        doc.moveTo(420, y + 32).lineTo(570, y + 32).stroke();
        doc.moveTo(490, y).lineTo(490, y + 50).stroke();
        
        doc.end();
        
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PdfGeneratorService;
