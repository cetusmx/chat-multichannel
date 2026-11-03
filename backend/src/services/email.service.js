const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require('../config/database');
require('dotenv').config();

const SALESFLOW_LOGO_PATH = path.join(__dirname, '../assets/salesflow-logo.png');
const SALESFLOW_LOGO_CID = 'salesflow-logo@salesflow.local';

function getSalesFlowLogoAttachment() {
  try {
    if (fs.existsSync(SALESFLOW_LOGO_PATH)) {
      return [
        {
          filename: 'salesflow-logo.png',
          path: SALESFLOW_LOGO_PATH,
          cid: SALESFLOW_LOGO_CID,
          contentDisposition: 'inline',
        },
      ];
    }
  } catch (_) {
    // Ignore file system errors and fall back to text-only header
  }
  return [];
}

function formatAccountScope(tenantName, isSuperadminAccount = false) {
  if (isSuperadminAccount || !tenantName || tenantName === 'SalesFlow' || tenantName === 'SalesFlow Superadmin') {
    return {
      subjectSuffix: 'SalesFlow',
      badgeLabel: 'Plataforma Central',
      inlineText: 'en la plataforma SalesFlow',
      inlineHtml: 'en la plataforma <strong style="color:#0f172a;">SalesFlow</strong>',
    };
  }
  return {
    subjectSuffix: `SalesFlow (${tenantName})`,
    badgeLabel: tenantName,
    inlineText: `en la plataforma SalesFlow para la empresa ${tenantName}`,
    inlineHtml: `en la plataforma <strong style="color:#0f172a;">SalesFlow</strong> para la empresa <strong style="color:#0f172a;">${tenantName}</strong>`,
  };
}

function buildStyledEmailHtml({
  badgeLabel = 'SalesFlow',
  title,
  bodyHtml,
  ctaText = null,
  ctaUrl = null,
  footerNote = null,
  hasLogo = true,
}) {
  const logoImgHtml = hasLogo
    ? `<td style="padding-right:12px;vertical-align:middle;" width="40">
         <div style="width:40px;height:40px;border-radius:10px;background-color:#0f172a;border:1px solid #1e293b;text-align:center;line-height:40px;">
           <img src="cid:${SALESFLOW_LOGO_CID}" alt="SalesFlow" width="28" height="28" style="display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none;" />
         </div>
       </td>`
    : '';

  const badgeHtml = badgeLabel
    ? `<td align="right" style="vertical-align:middle;">
         <span style="display:inline-block;background-color:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;letter-spacing:0.2px;">
           ${badgeLabel}
         </span>
       </td>`
    : '';

  const ctaBlockHtml =
    ctaText && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 22px;">
           <tr>
             <td align="center" bgcolor="#2563eb" style="border-radius:8px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);">
               <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                 ${ctaText}
               </a>
             </td>
           </tr>
         </table>
         <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-top:8px;">
           <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;">
             Enlace directo (si el botón no funciona)
           </p>
           <p style="margin:0;font-size:12px;line-height:1.5;color:#2563eb;word-break:break-all;">
             <a href="${ctaUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${ctaUrl}</a>
           </p>
         </div>`
      : '';

  const footerNoteHtml = footerNote
    ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#64748b;">${footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.05);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#2563eb 0%,#3b82f6 65%,#f97316 100%);background-color:#2563eb;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Header with Logo & Brand -->
          <tr>
            <td style="padding:22px 28px 18px;border-bottom:1px solid #e2e8f0;background-color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${logoImgHtml}
                        <td style="vertical-align:middle;">
                          <div style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;line-height:1.2;">
                            Sales<span style="color:#2563eb;">Flow</span>
                          </div>
                          <div style="font-size:11px;color:#64748b;font-weight:500;margin-top:2px;">
                            Gestión Comercial &amp; Comunicación Multicanal
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${badgeHtml}
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px 28px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;">
                ${title}
              </h1>
              ${bodyHtml}
              ${ctaBlockHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px 22px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              ${footerNoteHtml}
              <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
                Este es un mensaje automático de seguridad enviado por <strong>SalesFlow</strong>. Por favor, no respondas directamente a este correo si no requiere seguimiento.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    const logoAttachments = getSalesFlowLogoAttachment();

    const tempPassSectionText = temporaryPassword
      ? `\nUsuario: ${to}\nContraseña temporal: ${temporaryPassword}\n(Al iniciar sesión por primera vez o usar el enlace inferior deberás establecer una contraseña definitiva.)\n`
      : '';
    const tempPassSectionHtml = temporaryPassword
      ? `<div style="background-color:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #2563eb;border-radius:8px;padding:14px 16px;margin:18px 0;">
           <p style="margin:0;font-size:13px;color:#475569;">Usuario: <strong style="color:#0f172a;">${to}</strong></p>
           <p style="margin:8px 0 0;font-size:13px;color:#475569;">Contraseña temporal: <code style="background-color:#e2e8f0;color:#0f172a;padding:3px 8px;border-radius:4px;font-weight:700;font-family:monospace;">${temporaryPassword}</code></p>
         </div>`
      : '';

    const html = buildStyledEmailHtml({
      badgeLabel: scope.badgeLabel,
      title: 'Bienvenido a SalesFlow',
      hasLogo: logoAttachments.length > 0,
      bodyHtml: `
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
          Hola <strong style="color:#0f172a;">${name}</strong>, se ha creado tu cuenta de acceso ${scope.inlineHtml}.
        </p>
        ${tempPassSectionHtml}
        <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
          Por seguridad, establece tu contraseña personal haciendo clic en el siguiente botón (enlace válido por <strong>48 horas</strong>):
        </p>
      `,
      ctaText: 'Establecer mi contraseña',
      ctaUrl: resetUrl,
      footerNote: 'Si no reconoces la creación de esta cuenta, puedes ignorar este correo de forma segura.',
    });

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Bienvenido a ${scope.subjectSuffix} — Configura tu contraseña`,
        text: `Hola ${name},\n\nSe ha creado tu cuenta de acceso ${scope.inlineText}.${tempPassSectionText}\nPara establecer tu contraseña personalizada, ingresa al siguiente enlace (válido por 48 horas):\n${resetUrl}\n\nSi no reconoces esta cuenta, ignora este mensaje.`,
        html,
        attachments: logoAttachments,
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
    const logoAttachments = getSalesFlowLogoAttachment();

    const html = buildStyledEmailHtml({
      badgeLabel: scope.badgeLabel,
      title: 'Restablecer contraseña en SalesFlow',
      hasLogo: logoAttachments.length > 0,
      bodyHtml: `
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
          Hola <strong style="color:#0f172a;">${name}</strong>,
        </p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta ${scope.inlineHtml}. Haz clic en el siguiente botón para definir una nueva contraseña (válido por <strong>${validityLabel}</strong>):
        </p>
      `,
      ctaText: 'Restablecer contraseña',
      ctaUrl: resetUrl,
      footerNote: 'Si no solicitaste este cambio, ignora este mensaje; tu contraseña actual seguirá siendo válida.',
    });

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Recuperación de contraseña — ${scope.subjectSuffix}`,
        text: `Hola ${name},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta ${scope.inlineText}.\n\nUsa el siguiente enlace para definir una nueva contraseña (válido por ${validityLabel}):\n${resetUrl}\n\nSi tú no solicitaste este cambio, puedes ignorar este correo de forma segura.`,
        html,
        attachments: logoAttachments,
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
    const logoAttachments = getSalesFlowLogoAttachment();

    const html = buildStyledEmailHtml({
      badgeLabel: scope.badgeLabel,
      title: 'Contraseña actualizada en SalesFlow',
      hasLogo: logoAttachments.length > 0,
      bodyHtml: `
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
          Hola <strong style="color:#0f172a;">${name}</strong>,
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
          Te confirmamos que la contraseña de tu cuenta ${scope.inlineHtml} ha sido modificada exitosamente.
        </p>
        <div style="background-color:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:8px;padding:12px 14px;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9a3412;">
            <strong>¿No reconoces este cambio?</strong> Contacta de inmediato al administrador de tu empresa o plataforma para asegurar tu cuenta.
          </p>
        </div>
      `,
    });

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Tu contraseña ha sido actualizada — ${scope.subjectSuffix}`,
        text: `Hola ${name},\n\nTe confirmamos que la contraseña de tu cuenta ${scope.inlineText} fue actualizada exitosamente.\n\nSi no reconoces esta actividad, contacta de inmediato a tu administrador.`,
        html,
        attachments: logoAttachments,
      });
      return true;
    } catch (error) {
      console.error('[EMAIL_SERVICE] Error enviando confirmación de cambio de contraseña:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
