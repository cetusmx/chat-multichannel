const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfGeneratorService {
  /**
   * Genera un PDF de cotización a partir de los datos del cliente y su carrito.
   * @param {Object} clientData - Datos fiscales del cliente (ej. Razón Social, RFC, Dirección)
   * @param {Array} cartItems - Arreglo de productos en el carrito
   * @param {String} outputPath - Ruta destino para guardar el archivo
   * @returns {Promise<String>} Ruta final del PDF
   */
  static generateQuote(clientData, cartItems, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        
        doc.pipe(stream);
        
        // Header
        doc.fontSize(20).text('Cotización Comercial', { align: 'center' });
        doc.moveDown();
        
        // Client Data
        doc.fontSize(12).font('Helvetica-Bold').text('Datos del Cliente:');
        doc.font('Helvetica').fontSize(10);
        doc.text(`Razón Social / Nombre: ${clientData.name || clientData.NOMBRE || 'Cliente General'}`);
        if (clientData.RFC) doc.text(`RFC: ${clientData.RFC}`);
        if (clientData.phone) doc.text(`Teléfono: ${clientData.phone}`);
        if (clientData.address || clientData.CALLE) {
          const addr = clientData.address || `${clientData.CALLE} ${clientData.NUMEXT}, ${clientData.COLONIA}, C.P. ${clientData.CODIGO}`;
          doc.text(`Dirección: ${addr}`);
        }
        
        doc.moveDown();
        
        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Clave', 50, tableTop);
        doc.text('Descripción', 150, tableTop);
        doc.text('Cant.', 400, tableTop);
        doc.text('Precio U.', 450, tableTop);
        doc.text('Importe', 520, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let y = tableTop + 25;
        let subtotal = 0;
        
        doc.font('Helvetica').fontSize(10);
        cartItems.forEach(item => {
          const cantidad = item.cantidad || 1;
          const precio = item.precio || 0;
          const importe = cantidad * precio;
          subtotal += importe;
          
          doc.text(item.clave, 50, y);
          // Truncate description if too long
          const desc = item.descripcion.length > 40 ? item.descripcion.substring(0, 37) + '...' : item.descripcion;
          doc.text(desc, 150, y);
          doc.text(cantidad.toString(), 400, y);
          doc.text(`$${precio.toFixed(2)}`, 450, y);
          doc.text(`$${importe.toFixed(2)}`, 520, y);
          
          y += 20;
        });
        
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        
        // Totals
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 450, y);
        doc.text(`$${subtotal.toFixed(2)}`, 520, y);
        y += 15;
        doc.text('IVA (16%):', 450, y);
        doc.text(`$${iva.toFixed(2)}`, 520, y);
        y += 15;
        doc.text('Total Neto:', 450, y);
        doc.text(`$${total.toFixed(2)}`, 520, y);
        
        doc.moveDown(3);
        doc.font('Helvetica-Oblique').fontSize(9).text('Esta cotización tiene una vigencia de 15 días. Los precios están expresados en Moneda Nacional (MXN).', { align: 'center' });
        
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
