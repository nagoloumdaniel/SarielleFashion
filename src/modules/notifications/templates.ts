import type { EmailContext } from '@/modules/parametres/policies';
import { formatEuro as formatEuroFr } from '@/modules/reservations/format';
import { DEFAULT_LOCALE, INTL_LOCALE, absoluteUrl, isLocale, type Locale } from '@/i18n/config';
import { formatEuro as formatEuroLocale } from '@/i18n/format';
import { MESSAGES } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

/* ============================================================
 * P7.3 : modèles d'e-mails transactionnels.
 * Textes sobres (fr / de selon payload.locale), lien direct, aucune donnée
 * sensible au-delà de ce que le destinataire doit connaître.
 * Les e-mails admin_* restent en français.
 * ============================================================ */

export type NotificationTemplateKey =
  | 'booking_received'
  | 'booking_confirmed'
  | 'booking_cancelled_customer'
  | 'booking_cancelled_admin'
  | 'booking_rescheduled'
  | 'booking_reminder'
  | 'admin_new_booking'
  | 'admin_booking_cancelled'
  | 'admin_booking_rescheduled'
  | 'admin_contact_message'
  | 'contact_received'
  | 'conversation_reply'
  | 'custom_request_received'
  | 'admin_custom_request'
  | 'custom_request_decision'
  | 'waitlist_slot_available'
  | 'review_request'
  | 'assessment_decision'
  | 'admin_assessment_received';

export interface AppointmentEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'appointment';
  appointmentId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  startsAt: string;
  endsAt?: string;
  status?: string;
  reason?: string | null;
  cancelUrl?: string | null;
  /** Coiffure à domicile (instantané figé sur le rendez-vous). */
  homeService?: boolean;
  homeAddress?: string | null;
  travelFeeCents?: number | null;
}

export interface ConversationEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'conversation';
  conversationId?: string;
  customerName: string;
  customerEmail?: string;
  subject: string;
  message?: string;
  adminLink?: string | null;
}

export interface CustomRequestEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'custom';
  requestId: string;
  requesterName: string;
  requesterEmail?: string;
  description: string;
  desiredDate?: string | null;
  adminReply?: string | null;
  estimatedPriceCents?: number | null;
  proposedServiceName?: string | null;
  proposedSlot?: string | null;
  adminLink?: string | null;
}

export interface WaitlistEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'waitlist';
  customerName: string;
  serviceName: string;
  startsAt: string;
  confirmUrl: string;
  expiresAt: string;
}

export interface ReviewEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'review';
  customerName: string;
  serviceName: string;
  reviewUrl: string;
}

export type AssessmentDecisionKind = 'ACCEPTED' | 'CONDITIONAL' | 'REFUSED' | 'INFO_REQUESTED';

export interface AssessmentEmailPayload {
  /** Langue de l'e-mail client ('fr' par défaut si absente : anciennes lignes). */
  locale?: string;
  kind?: 'assessment';
  assessmentId?: string;
  customerName: string;
  customerEmail?: string;
  serviceName: string;
  /** Absent pour l'alerte admin « évaluation reçue ». */
  decision?: AssessmentDecisionKind;
  message?: string | null;
}

export type EmailPayload =
  | AppointmentEmailPayload
  | ConversationEmailPayload
  | CustomRequestEmailPayload
  | WaitlistEmailPayload
  | ReviewEmailPayload
  | AssessmentEmailPayload;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Langue d'un e-mail client. */
export type NotificationLocale = Locale;

/** Langue portée par le payload ('fr' si absente ou inconnue : lignes créées avant l'i18n). */
export function payloadLocale(payload: unknown): NotificationLocale {
  const value =
    payload && typeof payload === 'object' ? (payload as { locale?: unknown }).locale : undefined;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

/** Textes de la langue + formats : t('...') avec paramètres {nom}. */
function copyFor(locale: Locale) {
  const m = MESSAGES[locale].emails;
  return {
    locale,
    m,
    f: fill,
    euro: (cents: number) =>
      locale === DEFAULT_LOCALE ? formatEuroFr(cents) : formatEuroLocale(locale, cents),
    /** Chemin interne -> URL absolue dans la langue ; URL déjà absolue conservée. */
    url: (pathOrUrl: string) =>
      pathOrUrl.startsWith('/') ? absoluteUrl(locale, pathOrUrl) : pathOrUrl,
  };
}
type Copy = ReturnType<typeof copyFor>;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SALON_NAME = 'Sarielle Fashion';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(iso: string | undefined, locale: Locale = DEFAULT_LOCALE): string {
  const tbd = MESSAGES[locale].emails.dateTbd;
  if (!iso) return tbd;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return tbd;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

function isConversation(payload: EmailPayload): payload is ConversationEmailPayload {
  return typeof (payload as ConversationEmailPayload).subject === 'string';
}

function isCustomRequest(payload: EmailPayload): payload is CustomRequestEmailPayload {
  return (payload as CustomRequestEmailPayload).kind === 'custom';
}

function isWaitlist(payload: EmailPayload): payload is WaitlistEmailPayload {
  return (payload as WaitlistEmailPayload).kind === 'waitlist';
}

function isReview(payload: EmailPayload): payload is ReviewEmailPayload {
  return (payload as ReviewEmailPayload).kind === 'review';
}

function isAssessment(payload: EmailPayload): payload is AssessmentEmailPayload {
  return (payload as AssessmentEmailPayload).kind === 'assessment';
}

function renderWaitlist(payload: WaitlistEmailPayload, ctx: EmailContext): RenderedEmail {
  const c = copyFor(payloadLocale(payload));
  const w = c.m.waitlist;
  const p = {
    name: payload.customerName,
    service: payload.serviceName,
    when: formatDate(payload.startsAt, c.locale),
    expires: formatDate(payload.expiresAt, c.locale),
    url: payload.confirmUrl,
  };
  return {
    subject: c.f(w.subject, p),
    html: layout(
      ctx,
      {
        title: w.title,
        intro: c.f(w.intro, p),
        rows: [[c.m.row.slot, p.when]],
        ctaLabel: w.cta,
        ctaUrl: payload.confirmUrl,
        note: c.f(w.note, p),
      },
      c.locale,
    ),
    text: `${c.f(c.m.hello, p)}

${c.f(w.text, p)}

${c.m.salon}`,
  };
}

function renderReview(payload: ReviewEmailPayload, ctx: EmailContext): RenderedEmail {
  const c = copyFor(payloadLocale(payload));
  const r = c.m.review;
  const p = { name: payload.customerName, service: payload.serviceName, url: payload.reviewUrl };
  return {
    subject: r.subject,
    html: layout(
      ctx,
      {
        title: r.title,
        intro: c.f(r.intro, p),
        ctaLabel: r.cta,
        ctaUrl: payload.reviewUrl,
        note: r.note,
      },
      c.locale,
    ),
    text: `${c.f(c.m.hello, p)}

${c.f(r.text, p)}

${c.m.salon}`,
  };
}

interface LayoutInput {
  title: string;
  intro: string;
  rows?: Array<[string, string]>;
  paragraphs?: string[];
  ctaLabel?: string;
  ctaUrl?: string | null;
  note?: string;
  /** Blocs de politique affichés avant le pied (titre, texte). */
  policies?: Array<[string, string]>;
  /** E-mail destiné à la coiffeuse / au salon (bandeau « Espace professionnel »). */
  admin?: boolean;
}

function multiline(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function layout(ctx: EmailContext, input: LayoutInput, locale: Locale = DEFAULT_LOCALE): string {
  const lm = MESSAGES[locale].emails;
  const rows = (input.rows ?? [])
    .map(([label, value], index, all) => {
      const border = index < all.length - 1 ? 'border-bottom:1px solid #f1d6d3;' : '';
      return `
        <tr>
          <td style="padding:11px 0;${border}color:#67494c;font-size:12px;letter-spacing:.06em;text-transform:uppercase;vertical-align:top;width:38%">${escapeHtml(label)}</td>
          <td style="padding:11px 0;${border}color:#271719;font-size:15px;font-weight:600;vertical-align:top">${escapeHtml(value)}</td>
        </tr>`;
    })
    .join('');
  const paragraphs = (input.paragraphs ?? [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#271719;font-size:15px;line-height:1.7">${multiline(paragraph)}</p>`,
    )
    .join('');
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="#c62828" style="border-radius:999px;background:#c62828"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.02em;text-decoration:none;border-radius:999px">${escapeHtml(input.ctaLabel)}</a></td></tr></table>`
      : '';
  const note = input.note
    ? `<p style="margin:20px 0 0;color:#67494c;font-size:13px;line-height:1.6">${escapeHtml(input.note)}</p>`
    : '';
  const policies = (input.policies ?? [])
    .filter(([, text]) => text.trim() !== '')
    .map(
      ([title, text]) =>
        `<p style="margin:0 0 12px;color:#271719;font-size:13px;line-height:1.6"><strong style="color:#c62828">${escapeHtml(title)}</strong><br />${multiline(text)}</p>`,
    )
    .join('');
  const signature = ctx.signature?.trim() ? `<br /><br />${multiline(ctx.signature.trim())}` : '';
  const badge = input.admin ? 'Espace professionnel' : 'Message pour vous';

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7ecea;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7ecea">
      <tr>
        <td align="center" style="padding:32px 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
            <tr>
              <td align="center" style="background:#271719;border-radius:20px 20px 0 0;padding:34px 28px 28px">
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:.06em;color:#ffffff">${SALON_NAME}</p>
                <p style="margin:8px 0 0;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#ff6b6b">Mode &amp; couture</p>
              </td>
            </tr>
            <tr><td style="height:4px;line-height:4px;font-size:0;background:#ff6b6b">&nbsp;</td></tr>
            <tr>
              <td style="background:#ffffff;padding:36px 36px 32px;border-left:1px solid #f1d6d3;border-right:1px solid #f1d6d3">
                <p style="margin:0 0 14px"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:#fff4f2;border:1px solid #f1d6d3;color:#c62828;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">${badge}</span></p>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;color:#271719;font-size:28px;line-height:1.25">${escapeHtml(input.title)}</h1>
                <p style="margin:0 0 22px;color:#271719;font-size:16px;line-height:1.7">${escapeHtml(input.intro)}</p>
                ${rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff4f2;border:1px solid #f1d6d3;border-left:4px solid #c62828;border-radius:12px;margin:0 0 24px"><tr><td style="padding:8px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr></table>` : ''}
                ${paragraphs}
                ${cta}
                ${note}
                ${policies ? `<div style="margin:26px 0 0;padding:16px 18px;background:#fff4f2;border-radius:12px">${policies}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#fff4f2;border:1px solid #f1d6d3;border-top:0;border-radius:0 0 20px 20px;padding:22px 28px;color:#67494c;font-size:12px;line-height:1.7">
                <strong style="color:#271719;font-family:Georgia,'Times New Roman',serif;font-size:14px">${SALON_NAME}</strong><br />
                ${lm.paymentShort} ${lm.thanks}${signature}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function travelFeeLabel(cents: number | null | undefined, c: Copy): string {
  return cents ? c.euro(cents) : c.m.free;
}

/** Lignes texte « coiffure à domicile » (version texte brut des e-mails), vide sinon. */
function homeServiceText(payload: AppointmentEmailPayload, c: Copy): string {
  if (!payload.homeService) return '';
  const address = payload.homeAddress ? ` (${payload.homeAddress})` : '';
  return `${c.f(c.m.text.homeLocation, { address })}\n${c.f(c.m.text.travelFee, { fee: travelFeeLabel(payload.travelFeeCents, c) })}\n`;
}

function appointmentRows(
  payload: AppointmentEmailPayload,
  admin: boolean,
  c: Copy,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (admin) {
    // E-mails admin : toujours en français.
    if (payload.customerName) rows.push(['Cliente', payload.customerName]);
    if (payload.serviceName) rows.push(['Prestation', payload.serviceName]);
    if (payload.customerEmail) rows.push(['E-mail', payload.customerEmail]);
    if (payload.customerPhone) rows.push(['Téléphone', payload.customerPhone]);
    rows.push(['Créneau', formatDate(payload.startsAt)]);
    if (payload.homeService) {
      rows.push(['Lieu', 'À domicile']);
      if (payload.homeAddress) rows.push(['Adresse', payload.homeAddress]);
      rows.push(['Frais de déplacement', travelFeeLabel(payload.travelFeeCents, c)]);
    }
    if (payload.reason) rows.push(['Motif', payload.reason]);
    return rows;
  }
  const r = c.m.row;
  if (payload.customerName) rows.push([r.service, payload.serviceName ?? r.service]);
  rows.push([r.dateTime, formatDate(payload.startsAt, c.locale)]);
  if (payload.homeService) {
    rows.push([r.location, r.atHome]);
    if (payload.homeAddress) rows.push([r.address, payload.homeAddress]);
    rows.push([r.travelFee, travelFeeLabel(payload.travelFeeCents, c)]);
  }
  if (payload.reason) rows.push([r.reason, payload.reason]);
  return rows;
}

/* Politiques : texte saisi par Sarielle conservé tel quel ; à défaut, texte par défaut dans la langue du client. */
function formatNoticeDelayLocalized(minutes: number, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  const t = createTranslator(locale, MESSAGES[locale]);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (total < 60) return t('emails.policy.delayMinutes', { count: total, n: total });
  if (rest === 0) return t('emails.policy.delayHours', { count: hours, n: hours });
  return t('emails.policy.delayHoursMinutes', { h: hours, m: String(rest).padStart(2, '0') });
}

function localizedPolicies(ctx: EmailContext, c: Copy): { cancellation: string; booking: string } {
  const raw = ctx.raw;
  if (c.locale === DEFAULT_LOCALE || !raw) {
    return { cancellation: ctx.cancellationPolicy ?? '', booking: ctx.bookingPolicy ?? '' };
  }
  const notice = Math.max(0, Math.round(raw.minCancelNoticeMinutes));
  const cancellation =
    raw.cancellationPolicy?.trim() ||
    (notice > 0
      ? c.f(c.m.policy.cancelDefaultNotice, { delay: formatNoticeDelayLocalized(notice, c.locale) })
      : c.m.policy.cancelDefault);
  const booking = raw.bookingPolicy?.trim() || c.m.policy.bookingDefault;
  return { cancellation, booking };
}

function confirmationPolicies(ctx: EmailContext, c: Copy): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const { cancellation, booking } = localizedPolicies(ctx, c);
  if (cancellation) rows.push([c.m.policy.cancellation, cancellation]);
  if (booking) rows.push([c.m.policy.booking, booking]);
  return rows;
}

function confirmationPoliciesText(ctx: EmailContext, c: Copy): string {
  const rows = confirmationPolicies(ctx, c);
  return rows.length === 0
    ? ''
    : `\n${rows.map(([title, text]) => c.f(c.m.text.policyLine, { title, text })).join('\n\n')}\n`;
}

function renderAppointment(
  key: NotificationTemplateKey,
  payload: AppointmentEmailPayload,
  ctx: EmailContext,
): RenderedEmail {
  const admin = key.startsWith('admin_');
  const c = copyFor(admin ? DEFAULT_LOCALE : payloadLocale(payload));
  const service = payload.serviceName ?? c.m.yourService;
  const customer = payload.customerName;
  const when = formatDate(payload.startsAt, c.locale);
  const rows = appointmentRows(payload, admin, c);
  const home = homeServiceText(payload, c);
  const pay = c.m.paymentShort;
  const p = { name: customer, service, when };
  const hello = c.f(c.m.hello, p);
  const salon = c.m.salon;
  const newBookingUrl = c.url('/reserver');
  const appointmentLink = payload.appointmentId
    ? `${APP_URL}/dashboard/reservations/${payload.appointmentId}`
    : `${APP_URL}/dashboard/reservations`;

  switch (key) {
    case 'booking_received': {
      const b = c.m.bookingReceived;
      return {
        subject: b.subject,
        html: layout(
          ctx,
          { title: b.title, intro: c.f(b.intro, p), rows, note: `${pay} ${b.note}` },
          c.locale,
        ),
        text: `${hello}\n\n${c.f(b.text, p)}\n${c.f(c.m.text.dateLabel, p)}\n${home}${pay}\n\n${salon}`,
      };
    }
    case 'booking_confirmed': {
      const b = c.m.bookingConfirmed;
      return {
        subject: b.subject,
        html: layout(
          ctx,
          {
            title: b.title,
            intro: c.f(b.intro, p),
            rows,
            ctaLabel: b.cta,
            ctaUrl: payload.cancelUrl ?? null,
            note: `${pay} ${b.note}`,
            policies: confirmationPolicies(ctx, c),
          },
          c.locale,
        ),
        text: `${hello}\n\n${c.f(b.text, p)}\n${home}${pay}\n${payload.cancelUrl ? `${c.f(c.m.text.manageLink, { url: payload.cancelUrl })}\n` : ''}${confirmationPoliciesText(ctx, c)}\n${salon}`,
      };
    }
    case 'booking_cancelled_customer':
    case 'booking_cancelled_admin': {
      const b = c.m.bookingCancelled;
      return {
        subject: b.subject,
        html: layout(
          ctx,
          {
            title: b.title,
            intro: c.f(key === 'booking_cancelled_admin' ? b.introByAdmin : b.intro, p),
            rows,
            paragraphs: [b.paragraph],
            ctaLabel: b.cta,
            ctaUrl: newBookingUrl,
          },
          c.locale,
        ),
        text: `${hello}\n\n${c.f(b.text, { ...p, url: newBookingUrl })}\n\n${salon}`,
      };
    }
    case 'booking_rescheduled': {
      const b = c.m.bookingRescheduled;
      return {
        subject: b.subject,
        html: layout(
          ctx,
          {
            title: b.title,
            intro: c.f(b.intro, p),
            rows,
            ctaLabel: b.cta,
            ctaUrl: payload.cancelUrl ?? null,
            note: pay,
          },
          c.locale,
        ),
        text: `${hello}\n\n${c.f(b.text, p)}\n${home}${pay}\n\n${salon}`,
      };
    }
    case 'booking_reminder': {
      const b = c.m.bookingReminder;
      return {
        subject: b.subject,
        html: layout(
          ctx,
          {
            title: b.title,
            intro: c.f(b.intro, p),
            rows,
            ctaLabel: b.cta,
            ctaUrl: payload.cancelUrl ?? newBookingUrl,
            note: `${pay} ${b.note}`,
          },
          c.locale,
        ),
        text: `${hello}\n\n${c.f(b.text, p)}\n${home}${pay}\n\n${salon}`,
      };
    }
    case 'admin_new_booking':
      return {
        subject: `Nouvelle réservation : ${customer}`,
        html: layout(ctx, {
          title: 'Nouvelle réservation',
          admin: true,
          intro: `${customer} vient de réserver ${service}.`,
          rows,
          ctaLabel: 'Ouvrir la fiche rendez-vous',
          ctaUrl: appointmentLink,
        }),
        text: `Nouvelle réservation de ${customer} pour ${service} le ${when}.\n${home}\n${appointmentLink}`,
      };
    case 'admin_booking_cancelled':
      return {
        subject: `Annulation : ${customer}`,
        html: layout(ctx, {
          title: 'Rendez-vous annulé',
          admin: true,
          intro: `${customer} a annulé son rendez-vous pour ${service}.`,
          rows,
          ctaLabel: 'Ouvrir la fiche rendez-vous',
          ctaUrl: appointmentLink,
        }),
        text: `Annulation de ${customer} pour ${service} le ${when}.\n\n${appointmentLink}`,
      };
    case 'admin_booking_rescheduled':
      return {
        subject: `Reprogrammation : ${customer}`,
        html: layout(ctx, {
          title: 'Rendez-vous reprogrammé',
          admin: true,
          intro: `Le rendez-vous de ${customer} pour ${service} a été reprogrammé.`,
          rows,
          ctaLabel: 'Ouvrir la fiche rendez-vous',
          ctaUrl: appointmentLink,
        }),
        text: `Rendez-vous de ${customer} pour ${service} reprogrammé le ${when}.\n${home}\n${appointmentLink}`,
      };
    default:
      return { subject: '', html: '', text: '' };
  }
}

function renderConversation(
  key: NotificationTemplateKey,
  payload: ConversationEmailPayload,
  ctx: EmailContext,
): RenderedEmail {
  const messageLink = payload.adminLink
    ? `${APP_URL}${payload.adminLink}`
    : `${APP_URL}/dashboard/messages`;
  if (key === 'admin_contact_message') {
    return {
      subject: `Nouveau message : ${payload.subject}`,
      html: layout(ctx, {
        title: 'Nouveau message de contact',
        admin: true,
        intro: `${payload.customerName} t’a envoyé un message.`,
        rows: [
          ['Sujet', payload.subject],
          ['E-mail', payload.customerEmail ?? 'non renseigné'],
        ],
        paragraphs: payload.message ? [payload.message] : [],
        ctaLabel: 'Répondre dans le dashboard',
        ctaUrl: messageLink,
      }),
      text: `Nouveau message de ${payload.customerName}.\nSujet : ${payload.subject}\n${payload.message ?? ''}\n\n${messageLink}`,
    };
  }
  const c = copyFor(payloadLocale(payload));
  const p = { name: payload.customerName, subject: payload.subject };
  if (key === 'contact_received') {
    const m = c.m.contactReceived;
    return {
      subject: m.subject,
      html: layout(
        ctx,
        {
          title: m.title,
          intro: c.f(m.intro, p),
          rows: [[c.m.row.subject, payload.subject]],
          note: m.note,
        },
        c.locale,
      ),
      text: `${c.f(c.m.hello, p)}\n\n${c.f(m.text, p)}\n\n${c.m.salon}`,
    };
  }
  // conversation_reply
  const m = c.m.conversationReply;
  return {
    subject: c.f(m.subject, p),
    html: layout(
      ctx,
      {
        title: m.title,
        intro: c.f(m.intro, p),
        paragraphs: payload.message ? [payload.message] : [],
        note: m.note,
      },
      c.locale,
    ),
    text: `${c.f(c.m.hello, p)}\n\n${payload.message ?? ''}\n\n${c.m.salon}`,
  };
}

function renderCustomRequest(
  key: NotificationTemplateKey,
  payload: CustomRequestEmailPayload,
  ctx: EmailContext,
): RenderedEmail | null {
  const adminLink = payload.adminLink
    ? `${APP_URL}${payload.adminLink}`
    : `${APP_URL}/dashboard/demandes`;
  const desired = payload.desiredDate ? formatDate(payload.desiredDate) : null;
  if (key === 'custom_request_received') {
    const c = copyFor(payloadLocale(payload));
    const m = c.m.customRequestReceived;
    const p = { name: payload.requesterName };
    return {
      subject: m.subject,
      html: layout(
        ctx,
        {
          title: m.title,
          intro: c.f(m.intro, p),
          rows: [
            [
              c.m.row.desiredDate,
              payload.desiredDate ? formatDate(payload.desiredDate, c.locale) : c.m.notSpecified,
            ],
          ],
          paragraphs: [payload.description],
          note: m.note,
        },
        c.locale,
      ),
      text: `${c.f(c.m.hello, p)}\n\n${m.text}\n\n${c.m.salon}`,
    };
  }
  if (key === 'admin_custom_request') {
    return {
      subject: `Nouvelle demande personnalisée : ${payload.requesterName}`,
      html: layout(ctx, {
        title: 'Nouvelle demande personnalisée',
        admin: true,
        intro: `${payload.requesterName} t’a envoyé une demande de coiffure hors catalogue.`,
        rows: [
          ['Demandeuse', payload.requesterName],
          ['E-mail', payload.requesterEmail ?? 'Non renseigné'],
          ['Date souhaitée', desired ?? 'Non précisée'],
        ],
        paragraphs: [payload.description],
        ctaLabel: 'Ouvrir la demande',
        ctaUrl: adminLink,
      }),
      text: `Nouvelle demande de ${payload.requesterName}.\n${payload.description}\n\n${adminLink}`,
    };
  }
  if (key !== 'custom_request_decision') return null;
  const c = copyFor(payloadLocale(payload));
  const m = c.m.customRequestDecision;
  const p = { name: payload.requesterName };
  const price = payload.estimatedPriceCents == null ? null : c.euro(payload.estimatedPriceCents);
  const rows: Array<[string, string]> = [];
  if (price) rows.push([c.m.row.estimatedPrice, price]);
  if (payload.proposedServiceName)
    rows.push([c.m.row.proposedService, payload.proposedServiceName]);
  if (payload.proposedSlot)
    rows.push([c.m.row.proposedSlot, formatDate(payload.proposedSlot, c.locale)]);
  return {
    subject: m.subject,
    html: layout(
      ctx,
      {
        title: m.title,
        intro: c.f(m.intro, p),
        rows,
        paragraphs: payload.adminReply ? [payload.adminReply] : [],
        ctaLabel: m.cta,
        ctaUrl: c.url('/reserver'),
        note: m.note,
      },
      c.locale,
    ),
    text: `${c.f(c.m.hello, p)}\n\n${payload.adminReply ?? ''}\n${price ? `${c.f(c.m.text.priceLine, { price })}\n` : ''}${payload.proposedServiceName ? `${c.f(c.m.text.proposedServiceLine, { service: payload.proposedServiceName })}\n` : ''}\n${c.m.salon}`,
  };
}

const ASSESSMENT_DECISIONS: AssessmentDecisionKind[] = [
  'ACCEPTED',
  'CONDITIONAL',
  'REFUSED',
  'INFO_REQUESTED',
];

/* Décision de Sarielle sur une évaluation capillaire : jamais de réservation
   créée, le lien renvoie simplement vers le catalogue quand c'est accepté. */
function renderAdminAssessmentReceived(
  payload: AssessmentEmailPayload,
  ctx: EmailContext,
): RenderedEmail {
  const link = payload.assessmentId
    ? `${APP_URL}/dashboard/evaluations/${payload.assessmentId}`
    : `${APP_URL}/dashboard/evaluations`;
  const intro = `${payload.customerName} a envoyé une évaluation capillaire pour « ${payload.serviceName} ».`;
  return {
    subject: `Nouvelle évaluation : ${payload.serviceName}`,
    html: layout(ctx, {
      title: 'Nouvelle évaluation à traiter',
      admin: true,
      intro,
      rows: [
        ['Cliente', payload.customerName],
        ['E-mail', payload.customerEmail ?? 'Non renseigné'],
        ['Prestation', payload.serviceName],
      ],
      paragraphs: [],
      ctaLabel: 'Ouvrir l’évaluation',
      ctaUrl: link,
    }),
    text: `${intro}

${link}`,
  };
}

function renderAssessmentDecision(
  payload: AssessmentEmailPayload,
  ctx: EmailContext,
): RenderedEmail | null {
  if (!payload.decision || !ASSESSMENT_DECISIONS.includes(payload.decision)) return null;
  const c = copyFor(payloadLocale(payload));
  const a = c.m.assessment;
  const p = { name: payload.customerName, service: payload.serviceName };
  const catalogUrl = c.url('/coiffures');
  const canBook = payload.decision === 'ACCEPTED' || payload.decision === 'CONDITIONAL';
  const copy: Record<AssessmentDecisionKind, { subject: string; title: string; intro: string }> = {
    ACCEPTED: a.accepted,
    CONDITIONAL: a.conditional,
    REFUSED: a.refused,
    INFO_REQUESTED: a.infoRequested,
  };
  const { subject, title, intro } = copy[payload.decision];
  const message = payload.message?.trim() ?? '';
  const note = canBook
    ? a.noteBook
    : payload.decision === 'INFO_REQUESTED'
      ? a.noteInfo
      : undefined;
  const introText = c.f(intro, p);
  return {
    subject: c.f(subject, p),
    html: layout(
      ctx,
      {
        title,
        intro: introText,
        paragraphs: message ? [message] : [],
        ctaLabel: canBook ? a.cta : undefined,
        ctaUrl: canBook ? catalogUrl : null,
        note,
      },
      c.locale,
    ),
    text: [
      introText,
      message,
      canBook ? c.f(a.catalogue, { url: catalogUrl }) : '',
      note ?? '',
      c.m.salon,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

function renderInner(
  templateKey: string,
  payload: object,
  ctx: EmailContext,
): RenderedEmail | null {
  const key = templateKey as NotificationTemplateKey;
  if (isWaitlist(payload as EmailPayload)) {
    return key === 'waitlist_slot_available'
      ? renderWaitlist(payload as WaitlistEmailPayload, ctx)
      : null;
  }
  if (isReview(payload as EmailPayload)) {
    return key === 'review_request' ? renderReview(payload as ReviewEmailPayload, ctx) : null;
  }
  if (isAssessment(payload as EmailPayload)) {
    if (key === 'admin_assessment_received') {
      return renderAdminAssessmentReceived(payload as AssessmentEmailPayload, ctx);
    }
    return key === 'assessment_decision'
      ? renderAssessmentDecision(payload as AssessmentEmailPayload, ctx)
      : null;
  }
  if (isCustomRequest(payload as EmailPayload)) {
    return renderCustomRequest(key, payload as CustomRequestEmailPayload, ctx);
  }
  if (isConversation(payload as EmailPayload)) {
    if (!['admin_contact_message', 'contact_received', 'conversation_reply'].includes(key)) {
      return null;
    }
    return renderConversation(key, payload as ConversationEmailPayload, ctx);
  }
  const appointmentKeys: NotificationTemplateKey[] = [
    'booking_received',
    'booking_confirmed',
    'booking_cancelled_customer',
    'booking_cancelled_admin',
    'booking_rescheduled',
    'booking_reminder',
    'admin_new_booking',
    'admin_booking_cancelled',
    'admin_booking_rescheduled',
  ];
  if (!appointmentKeys.includes(key)) return null;
  return renderAppointment(key, payload as AppointmentEmailPayload, ctx);
}

/** Ajoute la signature à la version texte (le HTML la porte via le gabarit). */
function withTextSignature(text: string, ctx: EmailContext): string {
  const signature = ctx.signature?.trim();
  return signature ? `${text.trimEnd()}\n\n${signature}` : text;
}

export function renderNotification(
  templateKey: string,
  payload: unknown,
  context: EmailContext = {},
): RenderedEmail | null {
  if (!payload || typeof payload !== 'object') return null;
  const rendered = renderInner(templateKey, payload, context);
  if (!rendered) return null;
  return { ...rendered, text: withTextSignature(rendered.text, context) };
}

export function notificationTemplateExists(templateKey: string): boolean {
  return [
    'booking_received',
    'booking_confirmed',
    'booking_cancelled_customer',
    'booking_cancelled_admin',
    'booking_rescheduled',
    'booking_reminder',
    'admin_new_booking',
    'admin_booking_cancelled',
    'admin_booking_rescheduled',
    'admin_contact_message',
    'contact_received',
    'conversation_reply',
    'custom_request_received',
    'admin_custom_request',
    'custom_request_decision',
    'waitlist_slot_available',
    'review_request',
    'assessment_decision',
    'admin_assessment_received',
  ].includes(templateKey);
}
