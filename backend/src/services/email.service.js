const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendQuotationEmail(to, clientName, pdfPath) {
    if (!process.env.SMTP_HOST) {
      console.warn('[EMAIL_SERVICE] SMTP_HOST no está configurado. Simulando envío de email.');
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Ventas Seal Market" <${process.env.SMTP_USER}>`,
        to: to,
        subject: `Cotización - ${clientName}`,
        text: `Hola ${clientName},\n\nAdjuntamos la cotización solicitada.\n\nSaludos,\nEl equipo de ventas.`,
        html: `<p>Hola <strong>${clientName}</strong>,</p><p>Adjuntamos la cotización solicitada.</p><p>Saludos,<br/>El equipo de ventas.</p>`,
        attachments: [
          {
            filename: 'Cotizacion.pdf',
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log(`[EMAIL_SERVICE] Correo enviado a ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando correo:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
