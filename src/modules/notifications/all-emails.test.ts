import { describe, expect, it } from 'vitest';
import { getEmailProvider } from './provider';
import { notificationTemplateExists, renderNotification } from './templates';

/* Chaque opération qui envoie un e-mail (réservation, annulation, report, rappel,
   contact, messagerie, demande personnalisée, liste d'attente, avis, évaluation) :
   le modèle existe, produit sujet + HTML + texte, et le fournisseur l'accepte. */

const appointment = {
  kind: 'appointment',
  appointmentId: 'appt-1',
  customerName: 'Amina Diallo',
  customerEmail: 'amina@example.com',
  customerPhone: '+221770000000',
  serviceName: 'Tresses africaines',
  startsAt: '2026-11-05T10:00:00.000Z',
  status: 'CONFIRMED',
  cancelUrl: 'https://example.test/annulation/abc',
};
const conversation = {
  kind: 'conversation',
  conversationId: 'c-1',
  customerName: 'Amina Diallo',
  customerEmail: 'amina@example.com',
  subject: 'Question sur un rendez-vous',
  message: 'Bonjour,\nJ’ai une question.',
};
const custom = {
  kind: 'custom',
  requestId: 'r-1',
  requesterName: 'Amina Diallo',
  requesterEmail: 'amina@example.com',
  description: 'Une coiffure sur mesure pour un mariage.',
  desiredDate: '2026-12-01T09:00:00.000Z',
  adminReply: 'Avec plaisir.',
  estimatedPriceCents: 2500000,
  proposedServiceName: 'Tresses africaines',
  proposedSlot: '2026-12-01T09:00:00.000Z',
};
const assessment = {
  kind: 'assessment',
  assessmentId: 'a-1',
  customerName: 'Amina Diallo',
  customerEmail: 'amina@example.com',
  serviceName: 'Tresses africaines',
  decision: 'ACCEPTED',
  message: 'Tout est bon.',
};

const CASES: Array<[string, unknown, boolean]> = [
  ['booking_received', appointment, false],
  ['booking_confirmed', appointment, false],
  ['booking_cancelled_customer', appointment, false],
  ['booking_cancelled_admin', appointment, false],
  ['booking_rescheduled', appointment, false],
  ['booking_reminder', appointment, false],
  ['admin_new_booking', appointment, true],
  ['admin_booking_cancelled', appointment, true],
  ['admin_booking_rescheduled', appointment, true],
  ['admin_contact_message', conversation, true],
  ['contact_received', conversation, false],
  ['conversation_reply', conversation, false],
  ['custom_request_received', custom, false],
  ['admin_custom_request', custom, true],
  ['custom_request_decision', custom, false],
  [
    'waitlist_slot_available',
    {
      kind: 'waitlist',
      customerName: 'Amina Diallo',
      serviceName: 'Tresses africaines',
      startsAt: '2026-11-05T10:00:00.000Z',
      confirmUrl: 'https://example.test/liste-attente/x',
      expiresAt: '2026-11-04T10:00:00.000Z',
    },
    false,
  ],
  [
    'review_request',
    {
      kind: 'review',
      customerName: 'Amina Diallo',
      serviceName: 'Tresses africaines',
      reviewUrl: 'https://example.test/avis/x',
    },
    false,
  ],
  ['assessment_decision', assessment, false],
  ['admin_assessment_received', { ...assessment, decision: undefined }, true],
];

describe('tous les e-mails transactionnels', () => {
  it.each(CASES)('%s : modèle rendu et accepté par le fournisseur', async (key, payload, admin) => {
    expect(notificationTemplateExists(key)).toBe(true);
    const rendered = renderNotification(key, payload);
    expect(rendered, key).not.toBeNull();
    expect(rendered!.subject.trim().length).toBeGreaterThan(0);
    expect(rendered!.text.trim().length).toBeGreaterThan(0);
    expect(rendered!.html).toContain('<!doctype html>');
    expect(rendered!.html).toContain('Amina');
    // Bandeau professionnel pour la coiffeuse, jamais pour les clients.
    expect(rendered!.html.includes('Espace professionnel')).toBe(admin);

    const sent = await getEmailProvider().send({
      to: 'destinataire@example.com',
      subject: rendered!.subject,
      html: rendered!.html,
      text: rendered!.text,
    });
    expect(sent.id).toBeTruthy();
  });

  it('échappe le HTML saisi par les clients dans tous les gabarits', () => {
    const hostile = { ...appointment, customerName: '<img src=x onerror=alert(1)>' };
    for (const [key, ,] of CASES.filter(([k]) => k.includes('booking'))) {
      const rendered = renderNotification(key, hostile);
      expect(rendered!.html, key).not.toContain('<img src=x');
    }
  });
});
