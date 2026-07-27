const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { generateQuotationHtml } = require('../utils/quotationTemplate');

class PdfGeneratorService {
  /**
   * Genera un PDF de cotización a partir de los datos del cliente y su carrito.
   */
  static async generateQuote(clientData, cartItems, companyData, outputPath) {
    try {
      // Map properties to match template
      const templateData = {
        company: {
          name: companyData?.name || 'Seal Market',
          address: companyData?.address || 'Calle Ejemplo 123, Ciudad, País',
          rfc: companyData?.rfc || 'XAXX010101000',
          email: companyData?.email || 'ventas@sealmarket.com',
          phone: companyData?.phone || '555-123-4567'
        },
        client: {
          name: clientData.name || clientData.NOMBRE || 'Cliente General',
          rfc: clientData.RFC || '',
          address: clientData.address || (clientData.CALLE ? `${clientData.CALLE} ${clientData.NUMEXT}, ${clientData.COLONIA} C.P. ${clientData.CODIGO}` : ''),
          phone: clientData.phone || ''
        },
        cartItems: cartItems.map(item => ({
          cve_art: item.clave,
          desc: item.descripcion,
          quantity: item.cantidad || 1,
          precioNeto: item.precio || 0 
        })),
        bankDetails: companyData?.bankDetails || {
          bank: 'BANCOMER / BANAMEX',
          account: '0194674065 / 2793917',
          clabe: '012320001946740654 / Suc. 7007'
        }
      };

      const htmlContent = generateQuotationHtml(templateData);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browser.newPage();
      
      // Load HTML
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0px',
          bottom: '0px',
          left: '0px',
          right: '0px'
        }
      });

      await browser.close();

      // Write to file
      fs.writeFileSync(outputPath, pdfBuffer);
      return outputPath;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

module.exports = PdfGeneratorService;
