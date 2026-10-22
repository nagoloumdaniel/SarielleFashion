import type { EmailContext } from '@/modules/parametres/policies';
import { formatEuro } from '@/modules/reservations/format';

/* ============================================================
 * P7.3 : modèles d'e-mails transactionnels.
 * Textes français sobres, lien direct, aucune donnée sensible
 * au-delà de ce que le destinataire doit connaître.
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
  kind?: 'conversation';
  conversationId?: string;
  customerName: string;
  customerEmail?: string;
  subject: string;
  message?: string;
  adminLink?: string | null;
}

export interface CustomRequestEmailPayload {
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
  kind?: 'waitlist';
  customerName: string;
  serviceName: string;
  startsAt: string;
  confirmUrl: string;
  expiresAt: string;
}

export interface ReviewEmailPayload {
  kind?: 'review';
  customerName: string;
  serviceName: string;
  reviewUrl: string;
}

export type AssessmentDecisionKind = 'ACCEPTED' | 'CONDITIONAL' | 'REFUSED' | 'INFO_REQUESTED';

export interface AssessmentEmailPayload {
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

function formatDate(iso: string | undefined): string {
  if (!iso) return 'date à confirmer';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'date à confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
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
  return {
    subject: `Une place s’est libérée : ${payload.serviceName}`,
    html: layout(ctx, {
      title: 'Un créneau s’est libéré',
      intro: `Bonjour ${payload.customerName}, le créneau que vous attendiez pour ${payload.serviceName} vient de se libérer.`,
      rows: [['Créneau', formatDate(payload.startsAt)]],
      ctaLabel: 'Confirmer ma réservation',
      ctaUrl: payload.confirmUrl,
      note: `Ce lien est valable jusqu’au ${formatDate(payload.expiresAt)}. Passé ce délai, la place sera proposée à la personne suivante.`,
    }),
    text: `Bonjour ${payload.customerName},\n\nLe créneau du ${formatDate(payload.startsAt)} pour ${payload.serviceName} est disponible.\nConfirmez votre réservation : ${payload.confirmUrl}\nLien valable jusqu’au ${formatDate(payload.expiresAt)}.\n\n${SALON_NAME}`,
  };
}

function renderReview(payload: ReviewEmailPayload, ctx: EmailContext): RenderedEmail {
  return {
    subject: 'Votre avis compte pour Sarielle',
    html: layout(ctx, {
      title: 'Comment s’est passé votre rendez-vous ?',
      intro: `Bonjour ${payload.customerName}, Sarielle espère que votre prestation « ${payload.serviceName} » vous a plu. Votre avis aide d’autres clientes à faire leur choix.`,
      ctaLabel: 'Laisser un avis',
      ctaUrl: payload.reviewUrl,
      note: 'Votre avis est relu par Sarielle avant toute publication.',
    }),
    text: `Bonjour ${payload.customerName},\n\nVotre avis sur ${payload.serviceName} compte pour Sarielle.\nLaisser un avis : ${payload.reviewUrl}\n\n${SALON_NAME}`,
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
}

function multiline(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function layout(ctx: EmailContext, input: LayoutInput): string {
  const rows = (input.rows ?? [])
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#67494c;font-size:14px;vertical-align:top;width:38%">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#271719;font-size:14px;font-weight:600">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');
  const paragraphs = (input.paragraphs ?? [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;color:#271719;font-size:15px;line-height:1.6">${escapeHtml(paragraph)}</p>`,
    )
    .join('');
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:22px 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#c62828;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(input.ctaLabel)}</a></p>`
      : '';
  const note = input.note
    ? `<p style="margin:18px 0 0;color:#67494c;font-size:13px;line-height:1.5">${escapeHtml(input.note)}</p>`
    : '';

  const policies = (input.policies ?? [])
    .filter(([, text]) => text.trim() !== '')
    .map(
      ([title, text]) =>
        `<p style="margin:14px 0 0;color:#271719;font-size:13px;line-height:1.5"><strong>${escapeHtml(title)}</strong><br />${multiline(text)}</p>`,
    )
    .join('');
  const signature = ctx.signature?.trim() ? `<br /><br />${multiline(ctx.signature.trim())}` : '';

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px 12px;background:#fff8f7;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #f1d6d3">
            <tr><td>
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#c62828;font-weight:700">${SALON_NAME}</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;color:#271719;font-size:24px;line-height:1.3">${escapeHtml(input.title)}</h1>
              <p style="margin:0 0 16px;color:#271719;font-size:15px;line-height:1.6">${escapeHtml(input.intro)}</p>
              ${rows ? `<table role="presentation" width="100%" style="border-top:1px solid #f1d6d3;border-bottom:1px solid #f1d6d3;margin:8px 0 18px">${rows}</table>` : ''}
              ${paragraphs}
              ${cta}
              ${note}
              ${policies}
              <p style="margin:24px 0 0;border-top:1px solid #f1d6d3;padding-top:16px;color:#67494c;font-size:12px;line-height:1.6">
                ${SALON_NAME}<br />
                Paiement sur place. Merci de votre confiance.${signature}
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function travelFeeLabel(cents: number | null | undefined): string {
  return cents ? formatEuro(cents) : 'Offerts';
}

/** Lignes texte « coiffure à domicile » (version texte brut des e-mails), vide sinon. */
function homeServiceText(payload: AppointmentEmailPayload): string {
  if (!payload.homeService) return '';
  return `Lieu : à domicile${payload.homeAddress ? ` (${payload.homeAddress})` : ''}
Frais de déplacement : ${travelFeeLabel(payload.travelFeeCents)}
`;
}

function appointmentRows(
  payload: AppointmentEmailPayload,
  admin: boolean,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (payload.customerName)
    rows.push([
      admin ? 'Cliente' : 'Prestation',
      admin ? payload.customerName : (payload.serviceName ?? 'Prestation'),
    ]);
  if (admin) {
    if (payload.serviceName) rows.push(['Prestation', payload.serviceName]);
    if (payload.customerEmail) rows.push(['E-mail', payload.customerEmail]);
    if (payload.customerPhone) rows.push(['Téléphone', payload.customerPhone]);
  }
  rows.push([admin ? 'Créneau' : 'Date et heure', formatDate(payload.startsAt)]);
  if (payload.homeService) {
    rows.push(['Lieu', 'À domicile']);
    if (payload.homeAddress) rows.push(['Adresse', payload.homeAddress]);
    rows.push(['Frais de déplacement', travelFeeLabel(payload.travelFeeCents)]);
  }
  if (payload.reason) rows.push(['Motif', payload.reason]);
  return rows;
}

function confirmationPolicies(ctx: EmailContext): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (ctx.cancellationPolicy) rows.push(['Annulation', ctx.cancellationPolicy]);
  if (ctx.bookingPolicy) rows.push(['Conditions de réservation', ctx.bookingPolicy]);
  return rows;
}

function confirmationPoliciesText(ctx: EmailContext): string {
  const rows = confirmationPolicies(ctx);
  return rows.length === 0
    ? ''
    : `\n${rows.map(([title, text]) => `${title} : ${text}`).join('\n\n')}\n`;
}

function renderAppointment(
  key: NotificationTemplateKey,
  payload: AppointmentEmailPayload,
  ctx: EmailContext,
): RenderedEmail {
  const admin = key.startsWith('admin_');
  const service = payload.serviceName ?? 'votre prestation';
  const customer = payload.customerName;
  const when = formatDate(payload.startsAt);
  const rows = appointmentRows(payload, admin);
  const home = homeServiceText(payload);
  const appointmentLink = payload.appointmentId
    ? `${APP_URL}/dashboard/reservations/${payload.appointmentId}`
    : `${APP_URL}/dashboard/reservations`;

  switch (key) {
    case 'booking_received':
      return {
        subject: 'Votre demande de rendez-vous est enregistrée',
        html: layout(ctx, {
          title: 'Votre rendez-vous est enregistré',
          intro: `Bonjour ${customer}, votre réservation pour ${service} a bien été enregistrée. Sarielle confirmera votre créneau si nécessaire.`,
          rows,
          note: 'Paiement sur place. Vous recevrez une confirmation dès que le rendez-vous sera validé.',
        }),
        text: `Bonjour ${customer},\n\nVotre réservation pour ${service} est enregistrée.\nDate : ${when}\n${home}Paiement sur place.\n\n${SALON_NAME}`,
      };
    case 'booking_confirmed':
      return {
        subject: 'Votre rendez-vous est confirmé',
        html: layout(ctx, {
          title: 'Votre rendez-vous est confirmé',
          intro: `Bonjour ${customer}, votre rendez-vous pour ${service} est confirmé.`,
          rows,
          ctaLabel: 'Gérer ou annuler mon rendez-vous',
          ctaUrl: payload.cancelUrl ?? null,
          note: 'Paiement sur place. Conservez ce message pour retrouver votre rendez-vous.',
          policies: confirmationPolicies(ctx),
        }),
        text: `Bonjour ${customer},\n\nVotre rendez-vous pour ${service} est confirmé le ${when}.\n${home}Paiement sur place.\n${payload.cancelUrl ? `Gérer mon rendez-vous : ${payload.cancelUrl}\n` : ''}${confirmationPoliciesText(ctx)}\n${SALON_NAME}`,
      };
    case 'booking_cancelled_customer':
    case 'booking_cancelled_admin':
      return {
        subject: 'Votre rendez-vous est annulé',
        html: layout(ctx, {
          title: 'Votre rendez-vous est annulé',
          intro: `Bonjour ${customer}, votre rendez-vous pour ${service} a été annulé${key === 'booking_cancelled_admin' ? ' par Sarielle' : ''}.`,
          rows,
          paragraphs: [
            'Le créneau a été libéré. Vous pouvez réserver un nouveau rendez-vous depuis le site.',
          ],
          ctaLabel: 'Réserver un nouveau créneau',
          ctaUrl: `${APP_URL}/reserver`,
        }),
        text: `Bonjour ${customer},\n\nVotre rendez-vous pour ${service} du ${when} a été annulé.\nVous pouvez réserver un nouveau créneau : ${APP_URL}/reserver\n\n${SALON_NAME}`,
      };
    case 'booking_rescheduled':
      return {
        subject: 'Votre rendez-vous est reprogrammé',
        html: layout(ctx, {
          title: 'Votre rendez-vous est reprogrammé',
          intro: `Bonjour ${customer}, votre rendez-vous pour ${service} a été déplacé au nouveau créneau ci-dessous.`,
          rows,
          ctaLabel: 'Gérer ou annuler mon rendez-vous',
          ctaUrl: payload.cancelUrl ?? null,
          note: 'Paiement sur place.',
        }),
        text: `Bonjour ${customer},\n\nVotre rendez-vous pour ${service} est reprogrammé : ${when}.\n${home}Paiement sur place.\n\n${SALON_NAME}`,
      };
    case 'booking_reminder':
      return {
        subject: 'Rappel : votre rendez-vous approche',
        html: layout(ctx, {
          title: 'Votre rendez-vous approche',
          intro: `Bonjour ${customer}, un rappel pour votre rendez-vous pour ${service}.`,
          rows,
          ctaLabel: 'Voir mon rendez-vous',
          ctaUrl: payload.cancelUrl ?? `${APP_URL}/reserver`,
          note: 'Paiement sur place. En cas d’empêchement, utilisez le lien reçu avec votre confirmation.',
        }),
        text: `Bonjour ${customer},\n\nRappel : rendez-vous pour ${service} le ${when}.\n${home}Paiement sur place.\n\n${SALON_NAME}`,
      };
    case 'admin_new_booking':
      return {
        subject: `Nouvelle réservation : ${customer}`,
        html: layout(ctx, {
          title: 'Nouvelle réservation',
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
        intro: `${payload.customerName} vous a envoyé un message.`,
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
  if (key === 'contact_received') {
    return {
      subject: 'Votre message a bien été reçu',
      html: layout(ctx, {
        title: 'Message bien reçu',
        intro: `Bonjour ${payload.customerName}, Sarielle a bien reçu votre message et vous répondra personnellement.`,
        rows: [['Sujet', payload.subject]],
        note: 'Vous pouvez répondre directement à cet e-mail.',
      }),
      text: `Bonjour ${payload.customerName},\n\nVotre message « ${payload.subject} » a bien été reçu. Sarielle vous répondra personnellement.\n\n${SALON_NAME}`,
    };
  }
  // conversation_reply
  return {
    subject: `Réponse à votre message : ${payload.subject}`,
    html: layout(ctx, {
      title: 'Réponse de Sarielle',
      intro: `Bonjour ${payload.customerName}, voici la réponse à votre message.`,
      paragraphs: payload.message ? [payload.message] : [],
      note: 'Vous pouvez répondre directement à cet e-mail.',
    }),
    text: `Bonjour ${payload.customerName},\n\n${payload.message ?? ''}\n\n${SALON_NAME}`,
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
    return {
      subject: 'Votre demande de coiffure personnalisée a bien été reçue',
      html: layout(ctx, {
        title: 'Demande bien reçue',
        intro: `Bonjour ${payload.requesterName}, Sarielle a bien reçu votre demande de coiffure personnalisée et vous répondra personnellement.`,
        rows: [['Date souhaitée', desired ?? 'Non précisée']],
        paragraphs: [payload.description],
        note: 'Cette demande ne réserve pas encore de créneau. Sarielle vous proposera une prestation ou un rendez-vous adapté.',
      }),
      text: `Bonjour ${payload.requesterName},\n\nVotre demande de coiffure personnalisée a bien été reçue. Sarielle vous répondra personnellement.\n\n${SALON_NAME}`,
    };
  }
  if (key === 'admin_custom_request') {
    return {
      subject: `Nouvelle demande personnalisée : ${payload.requesterName}`,
      html: layout(ctx, {
        title: 'Nouvelle demande personnalisée',
        intro: `${payload.requesterName} vous a envoyé une demande de coiffure hors catalogue.`,
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
  const price =
    payload.estimatedPriceCents == null
      ? null
      : new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 2,
        }).format(payload.estimatedPriceCents / 100);
  const rows: Array<[string, string]> = [];
  if (price) rows.push(['Prix estimé', price]);
  if (payload.proposedServiceName) rows.push(['Prestation proposée', payload.proposedServiceName]);
  if (payload.proposedSlot) rows.push(['Créneau proposé', formatDate(payload.proposedSlot)]);
  return {
    subject: 'Réponse à votre demande de coiffure personnalisée',
    html: layout(ctx, {
      title: 'Réponse de Sarielle',
      intro: `Bonjour ${payload.requesterName}, voici la réponse à votre demande de coiffure personnalisée.`,
      rows,
      paragraphs: payload.adminReply ? [payload.adminReply] : [],
      ctaLabel: 'Réserver un créneau',
      ctaUrl: `${APP_URL}/reserver`,
      note: 'Une proposition de créneau ne réserve pas automatiquement le rendez-vous : la réservation reste nécessaire.',
    }),
    text: `Bonjour ${payload.requesterName},\n\n${payload.adminReply ?? ''}\n${price ? `Prix estimé : ${price}\n` : ''}${payload.proposedServiceName ? `Prestation proposée : ${payload.proposedServiceName}\n` : ''}\n${SALON_NAME}`,
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
  const name = payload.customerName;
  const service = payload.serviceName;
  const catalogUrl = `${APP_URL}/coiffures`;
  const canBook = payload.decision === 'ACCEPTED' || payload.decision === 'CONDITIONAL';
  const copy: Record<AssessmentDecisionKind, { subject: string; title: string; intro: string }> = {
    ACCEPTED: {
      subject: `Évaluation acceptée : ${service}`,
      title: 'Votre évaluation est acceptée',
      intro: `Bonjour ${name}, Sarielle a étudié votre évaluation pour « ${service} » : votre chevelure est compatible.`,
    },
    CONDITIONAL: {
      subject: `Évaluation acceptée sous conditions : ${service}`,
      title: 'Évaluation acceptée sous conditions',
      intro: `Bonjour ${name}, Sarielle a étudié votre évaluation pour « ${service} » : la prestation est possible sous conditions, détaillées ci-dessous.`,
    },
    REFUSED: {
      subject: `Réponse à votre évaluation : ${service}`,
      title: 'Réponse à votre évaluation',
      intro: `Bonjour ${name}, Sarielle a étudié votre évaluation pour « ${service} ». Cette prestation ne peut malheureusement pas être réalisée dans votre situation.`,
    },
    INFO_REQUESTED: {
      subject: `Précisions demandées : ${service}`,
      title: 'Sarielle a besoin de précisions',
      intro: `Bonjour ${name}, Sarielle a étudié votre évaluation pour « ${service} » et souhaite quelques précisions avant de se prononcer.`,
    },
  };
  const { subject, title, intro } = copy[payload.decision];
  const message = payload.message?.trim() ?? '';
  const note = canBook
    ? 'Cette réponse ne réserve aucun rendez-vous : choisissez votre coiffure et votre créneau depuis le catalogue.'
    : payload.decision === 'INFO_REQUESTED'
      ? 'Aucun rendez-vous n’est réservé. Répondez à cet e-mail ou contactez Sarielle depuis le site.'
      : undefined;
  return {
    subject,
    html: layout(ctx, {
      title,
      intro,
      paragraphs: message ? [message] : [],
      ctaLabel: canBook ? 'Choisir ma coiffure et réserver' : undefined,
      ctaUrl: canBook ? catalogUrl : null,
      note,
    }),
    text: [intro, message, canBook ? `Catalogue : ${catalogUrl}` : '', note ?? '', SALON_NAME]
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
