const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

class EmailService {
  constructor() {
    this.defaultTransporter = null;
    if (process.env.SMTP_HOST) {
      this.defaultTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendQuotationEmail(to, clientName, pdfPath, tenantId, tenantName = 'Ventas') {
    let transporter = this.defaultTransporter;
    let fromEmail = process.env.SMTP_USER;
    let fromName = tenantName;

    // Check if tenant has custom EmailConfig
    if (tenantId) {
      const emailConfig = await prisma.emailConfig.findUnique({ where: { tenantId } });
      if (emailConfig && emailConfig.host && emailConfig.user && emailConfig.password) {
        transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
        });
        fromEmail = emailConfig.fromEmail || emailConfig.user;
        fromName = emailConfig.fromName || tenantName;
      }
    }

    if (!transporter) {
      console.warn('[EMAIL_SERVICE] No hay configuración SMTP (ni default ni de tenant). Simulando envío de email.');
      return true;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
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
