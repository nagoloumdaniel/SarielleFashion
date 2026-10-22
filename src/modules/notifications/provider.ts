import nodemailer from 'nodemailer';
/* ============================================================
 * P7.1 : abstraction du fournisseur d'e-mail.
 * Gmail SMTP en production, fournisseur console en développement et
 * dans les tests. Aucune clé n'est jamais journalisée.
 * ============================================================ */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface EmailProvider {
  name: 'smtp' | 'console';
  send(message: EmailMessage): Promise<{ id: string }>;
}

const FROM = process.env.EMAIL_FROM?.trim() || 'Sarielle Fashion <sarielletalla@gmail.com>';
/* Gmail SMTP : compte Google avec validation en deux étapes + mot de passe d'application.
   Gmail réécrit l'expéditeur avec le compte authentifié : on l'utilise directement. */
class SmtpEmailProvider implements EmailProvider {
  name = 'smtp' as const;

  async send(message: EmailMessage): Promise<{ id: string }> {
    const user = process.env.SMTP_USER?.trim();
    // Google affiche le mot de passe d'application par groupes de 4 : on retire les espaces.
    const pass = process.env.SMTP_PASSWORD?.replace(/\s+/g, '');
    if (!user || !pass) throw new Error('SMTP_USER ou SMTP_PASSWORD absent');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    try {
      const info = await transporter.sendMail({
        from: `Sarielle Fashion <${user}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      return { id: info.messageId };
    } catch (error) {
      // Message court : jamais d'identifiants ni de contenu dans l'erreur journalisée.
      const code = (error as { responseCode?: number; code?: string }).responseCode;
      const reason = (error as { code?: string }).code ?? 'erreur inconnue';
      throw new Error(`SMTP a refusé l'envoi (${code ?? reason})`);
    } finally {
      transporter.close();
    }
  }
}

class ConsoleEmailProvider implements EmailProvider {
  name = 'console' as const;

  async send(message: EmailMessage): Promise<{ id: string }> {
    // Aucun contenu ni destinataire complet dans les journaux : preuve d'envoi simulé.
    console.info(
      `[email:console] ${message.subject} -> ${maskEmail(message.to)} (${message.text.length} caractères)`,
    );
    return { id: `console-${crypto.randomUUID()}` };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'destinataire masqué';
  return `${local.slice(0, 2)}***@${domain}`;
}

export function getEmailProvider(): EmailProvider {
  const forceConsole =
    process.env.EMAIL_MODE === 'console' ||
    process.env.EMAIL_MODE === 'disabled' ||
    process.env.NODE_ENV === 'test';
  if (
    !forceConsole &&
    process.env.EMAIL_MODE === 'smtp' &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASSWORD?.trim()
  ) {
    return new SmtpEmailProvider();
  }
  return new ConsoleEmailProvider();
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailProvider().name !== 'console' || process.env.EMAIL_MODE === 'console';
}
