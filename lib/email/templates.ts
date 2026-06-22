import 'server-only';

/**
 * Branded, email-safe HTML templates ("Acero & Escarlata").
 * Email needs table layout + inline CSS + web-safe fonts (Archivo/Inter do not
 * load in mail clients, so we fall back to a Helvetica/Arial stack). Colors are
 * the exact tokens from DESIGN.md, written as literal hex (email has no CSS vars).
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://evefitmethod.com').replace(/\/$/, '');

const C = {
  canvas: '#0E1015',
  surface: '#171B23',
  border: '#2A303C',
  hairline: '#232936',
  primary: '#FF3B47',
  onPrimary: '#FFFFFF',
  fg: '#EEF1F6',
  muted: '#A7AEBA',
  faint: '#6B7280',
};
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Bulletproof, table-based scarlet CTA button. */
export function button(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td align="center" bgcolor="${C.primary}" style="border-radius:12px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1;color:${C.onPrimary};text-decoration:none;border-radius:12px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Page wrapper: dark canvas, centered surface card, wordmark header + footer. */
export function shell(preheader: string, inner: string): string {
  const year = '2026';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>EveFit Method</title>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.surface};border:1px solid ${C.border};border-radius:20px;overflow:hidden;">
        <!-- scarlet accent bar -->
        <tr><td style="height:4px;background-color:${C.primary};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- header -->
        <tr>
          <td style="padding:28px 32px 8px;">
            <img src="${SITE}/brand-icon.png" width="30" height="22" alt="" style="vertical-align:middle;margin-right:9px;border:0;" />
            <span style="font-family:${FONT};font-size:15px;font-weight:800;letter-spacing:2px;color:${C.fg};text-transform:uppercase;vertical-align:middle;">EVEFIT</span>
            <span style="font-family:${FONT};font-size:15px;font-weight:800;letter-spacing:2px;color:${C.primary};text-transform:uppercase;"> / </span>
            <span style="font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:2px;color:${C.muted};text-transform:uppercase;">METHOD</span>
          </td>
        </tr>
        <!-- content -->
        <tr><td style="padding:8px 32px 32px;font-family:${FONT};">${inner}</td></tr>
        <!-- footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background-color:${C.hairline};font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr>
          <td style="padding:24px 32px 28px;">
            <p style="margin:0 0 12px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">
              EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo medico, diagnostico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentacion o entrenamiento.
            </p>
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">
              <a href="${SITE}" target="_blank" style="color:${C.muted};text-decoration:none;">evefitmethod.com</a>
              &nbsp;&middot;&nbsp;
              <a href="${SITE}/terms" target="_blank" style="color:${C.muted};text-decoration:none;">Terminos</a>
              &nbsp;&middot;&nbsp;
              <a href="${SITE}/privacy" target="_blank" style="color:${C.muted};text-decoration:none;">Privacidad</a>
              <br>&copy; ${year} EveFit Method
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

export function h1(text: string): string {
  return `<h1 style="margin:8px 0 0;font-family:${FONT};font-size:26px;line-height:1.2;font-weight:800;color:${C.fg};">${text}</h1>`;
}
export function p(text: string): string {
  return `<p style="margin:16px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.muted};">${text}</p>`;
}

export interface EmailContent {
  subject: string;
  html: string;
}

/**
 * NOTE: the concrete per-message emails (invitation, welcome, etc.) now live in
 * lib/email/render.ts, which merges coach-editable overrides from the
 * message_templates table with on-brand defaults and reuses the shell + block
 * helpers exported above. This file only owns the email-safe building blocks.
 */
