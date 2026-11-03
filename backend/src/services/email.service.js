const nodemailer = require('nodemailer');
const prisma = require('../config/database');
require('dotenv').config();

function formatAccountScope(tenantName, isSuperadminAccount = false) {
  if (isSuperadminAccount || !tenantName || tenantName === 'SalesFlow' || tenantName === 'SalesFlow Superadmin') {
    return {
      subjectSuffix: 'SalesFlow',
      inlineText: 'en la plataforma SalesFlow',
      inlineHtml: 'en la plataforma <strong>SalesFlow</strong>',
    };
  }
  return {
    subjectSuffix: `SalesFlow (${tenantName})`,
    inlineText: `en la plataforma SalesFlow para la empresa ${tenantName}`,
    inlineHtml: `en la plataforma <strong>SalesFlow</strong> para la empresa <strong>${tenantName}</strong>`,
  };
}

class EmailService {
  constructor() {
    this.defaultTransporter = null;
    if (process.env.SMTP_HOST) {
      this.defaultTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async resolveTransporter({ tenantId = null, defaultSenderName = 'SalesFlow', preferPlatform = false } = {}) {
    // 1. Check tenant-specific EmailConfig first unless preferPlatform is true
    if (tenantId && !preferPlatform) {
      try {
        const emailConfig = await prisma.emailConfig?.findUnique({ where: { tenantId } });
        if (emailConfig && emailConfig.host && emailConfig.user && emailConfig.password) {
          return {
            transporter: nodemailer.createTransport({
              host: emailConfig.host,
              port: emailConfig.port,
              secure: emailConfig.secure,
              auth: {
                user: emailConfig.user,
                pass: emailConfig.password,
              },
            }),
            fromEmail: emailConfig.fromEmail || emailConfig.user,
            fromName: emailConfig.fromName || defaultSenderName,
          };
        }
      } catch (err) {
        console.warn('[EMAIL_SERVICE] No se pudo consultar EmailConfig del tenant:', err.message);
      }
    }

    // 2. Check Superadmin / Platform EmailConfig
    try {
      const platformConfig = await prisma.platformEmailConfig?.findUnique({ where: { id: 'default' } });
      if (platformConfig && platformConfig.host && platformConfig.user && platformConfig.password) {
        return {
          transporter: nodemailer.createTransport({
            host: platformConfig.host,
            port: platformConfig.port,
            secure: platformConfig.secure,
            auth: {
              user: platformConfig.user,
              pass: platformConfig.password,
            },
          }),
          fromEmail: platformConfig.fromEmail || platformConfig.user,
          fromName: platformConfig.fromName || 'SalesFlow',
        };
      }
    } catch (err) {
      console.warn('[EMAIL_SERVICE] No se pudo consultar PlatformEmailConfig:', err.message);
    }

    // 3. Fallback to environment SMTP
    if (this.defaultTransporter) {
      return {
        transporter: this.defaultTransporter,
        fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        fromName: process.env.SMTP_FROM_NAME || defaultSenderName,
      };
    }

    return { transporter: null, fromEmail: null, fromName: defaultSenderName };
  }

  async sendQuotationEmail(to, clientName, pdfPath, tenantId, tenantName = 'Ventas') {
    const { transporter, fromEmail, fromName } = await this.resolveTransporter({
      tenantId,
      defaultSenderName: tenantName,
    });

    if (!transporter) {
      console.warn('[EMAIL_SERVICE] No hay configuración SMTP (ni default ni de tenant). Simulando envío de email.');
      return true;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Cotización - ${clientName}`,
        text: `Hola ${clientName},\n\nAdjuntamos la cotización solicitada.\n\nSaludos,\nEl equipo de ventas.`,
        html: `<p>Hola <strong>${clientName}</strong>,</p><p>Adjuntamos la cotización solicitada.</p><p>Saludos,<br/>El equipo de ventas.</p>`,
        attachments: [
          {
            filename: 'Cotizacion.pdf',
            path: pdfPath,
            contentType: 'application/pdf',
          },
        ],
      });

      console.log(`[EMAIL_SERVICE] Correo enviado a ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando correo:', error);
      throw error;
    }
  }

  async sendWelcomePasswordEmail({
    to,
    name,
    tenantName = 'SalesFlow',
    resetUrl,
    temporaryPassword = null,
    tenantId = null,
    preferPlatform = false,
  }) {
    const { transporter, fromEmail, fromName } = await this.resolveTransporter({
      tenantId,
      defaultSenderName: preferPlatform ? 'SalesFlow' : `${tenantName} — SalesFlow`,
      preferPlatform,
    });

    if (!transporter) {
      console.warn(`[EMAIL_SERVICE] Sin SMTP configurado. Enlace de activación para ${to}: ${resetUrl}`);
      return false;
    }

    const scope = formatAccountScope(tenantName, !tenantId && tenantName === 'SalesFlow Superadmin');

    const tempPassSectionText = temporaryPassword
      ? `\nUsuario: ${to}\nContraseña temporal: ${temporaryPassword}\n(Al iniciar sesión por primera vez o usar el enlace inferior deberás establecer una contraseña definitiva.)\n`
      : '';
    const tempPassSectionHtml = temporaryPassword
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:16px 0;">
           <p style="margin:0;font-size:13px;color:#475569;">Usuario: <strong>${to}</strong></p>
           <p style="margin:6px 0 0;font-size:13px;color:#475569;">Contraseña temporal: <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${temporaryPassword}</code></p>
         </div>`
      : '';

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Bienvenido a ${scope.subjectSuffix} — Configura tu contraseña`,
        text: `Hola ${name},\n\nSe ha creado tu cuenta de acceso ${scope.inlineText}.${tempPassSectionText}\nPara establecer tu contraseña personalizada, ingresa al siguiente enlace (válido por 48 horas):\n${resetUrl}\n\nSi no reconoces esta cuenta, ignora este mensaje.`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="margin:0 0 12px;font-size:20px;">Bienvenido a SalesFlow</h2>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Hola <strong>${name}</strong>, se ha creado tu cuenta de acceso ${scope.inlineHtml}.</p>
            ${tempPassSectionHtml}
            <p style="font-size:14px;line-height:1.6;color:#334155;">Por seguridad, establece tu contraseña personal haciendo clic en el siguiente botón (enlace válido por 48 horas):</p>
            <p style="margin:24px 0;">
              <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">
                Establecer mi contraseña
              </a>
            </p>
            <p style="font-size:12px;color:#64748b;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${resetUrl}</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando correo de bienvenida:', error.message);
      return false;
    }
  }

  async sendPasswordResetEmail({
    to,
    name,
    resetUrl,
    tenantName = 'SalesFlow',
    tenantId = null,
    preferPlatform = false,
    validityLabel = '1 hora',
  }) {
    const { transporter, fromEmail, fromName } = await this.resolveTransporter({
      tenantId,
      defaultSenderName: preferPlatform ? 'SalesFlow' : `${tenantName} — SalesFlow`,
      preferPlatform,
    });

    if (!transporter) {
      console.warn(`[EMAIL_SERVICE] Sin SMTP configurado. Enlace de recuperación para ${to}: ${resetUrl}`);
      return false;
    }

    const scope = formatAccountScope(tenantName, !tenantId && tenantName === 'SalesFlow Superadmin');

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Recuperación de contraseña — ${scope.subjectSuffix}`,
        text: `Hola ${name},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta ${scope.inlineText}.\n\nUsa el siguiente enlace para definir una nueva contraseña (válido por ${validityLabel}):\n${resetUrl}\n\nSi tú no solicitaste este cambio, puedes ignorar este correo de forma segura.`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="margin:0 0 12px;font-size:20px;">Restablecer contraseña en SalesFlow</h2>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Hola <strong>${name}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Recibimos una solicitud para restablecer la contraseña de tu cuenta ${scope.inlineHtml}. Haz clic en el siguiente botón para definir una nueva contraseña (válido por ${validityLabel}):</p>
            <p style="margin:24px 0;">
              <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">
                Restablecer contraseña
              </a>
            </p>
            <p style="font-size:12px;color:#64748b;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${resetUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
            <p style="font-size:12px;color:#94a3b8;">Si no solicitaste este cambio, ignora este mensaje; tu contraseña actual seguirá siendo válida.</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando correo de recuperación:', error.message);
      return false;
    }
  }

  async sendPasswordChangedNotification({
    to,
    name,
    tenantName = 'SalesFlow',
    tenantId = null,
    preferPlatform = false,
  }) {
    const { transporter, fromEmail, fromName } = await this.resolveTransporter({
      tenantId,
      defaultSenderName: preferPlatform ? 'SalesFlow' : `${tenantName} — SalesFlow`,
      preferPlatform,
    });

    if (!transporter) return false;

    const scope = formatAccountScope(tenantName, !tenantId && tenantName === 'SalesFlow Superadmin');

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Tu contraseña ha sido actualizada — ${scope.subjectSuffix}`,
        text: `Hola ${name},\n\nTe confirmamos que la contraseña de tu cuenta ${scope.inlineText} fue actualizada exitosamente.\n\nSi no reconoces esta actividad, contacta de inmediato a tu administrador.`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="margin:0 0 12px;font-size:20px;">Contraseña actualizada en SalesFlow</h2>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Hola <strong>${name}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;color:#334155;">Te confirmamos que la contraseña de tu cuenta ${scope.inlineHtml} ha sido modificada exitosamente.</p>
            <p style="font-size:12px;color:#64748b;margin-top:20px;">Si tú no realizaste este cambio, contacta de inmediato al administrador.</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando confirmación de cambio de contraseña:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
