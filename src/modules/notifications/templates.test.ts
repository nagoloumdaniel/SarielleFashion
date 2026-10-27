import { describe, expect, it } from 'vitest';
import { notificationTemplateExists, payloadLocale, renderNotification } from './templates';

const appointment = {
  kind: 'appointment',
  appointmentId: 'appt-1',
  customerName: 'Amina <Test>',
  customerEmail: 'amina@example.com',
  serviceName: 'Tresses BOX',
  startsAt: '2026-10-22T08:00:00.000Z',
  status: 'CONFIRMED',
  cancelUrl: 'https://example.test/annulation/abc',
};

describe('renderNotification', () => {
  it('should render a confirmation email with date, service and secure link', () => {
    const rendered = renderNotification('booking_confirmed', appointment);
    expect(rendered?.subject).toContain('confirmé');
    expect(rendered?.html).toContain('Tresses BOX');
    expect(rendered?.html).toContain('https://example.test/annulation/abc');
    expect(rendered?.text).toContain('Amina');
  });

  it('should state on-site payment by cash or transfer in customer emails, never online payment', () => {
    for (const key of [
      'booking_received',
      'booking_confirmed',
      'booking_rescheduled',
      'booking_reminder',
    ]) {
      const rendered = renderNotification(key, appointment);
      expect(rendered?.html, key).toContain('Paiement sur place, en espèces ou par virement');
      expect(rendered?.text, key).toContain('en espèces ou par virement');
      expect(rendered?.html.toLowerCase(), key).not.toMatch(/paypal|carte bancaire|payer en ligne/);
    }
  });

  it('should use the informal tone (tutoiement) in booking emails', () => {
    const rendered = renderNotification('booking_confirmed', appointment);
    expect(rendered?.html).toContain('ton rendez-vous');
    expect(rendered?.html).not.toMatch(/votre|vous/i);
  });

  it('should escape HTML from user-controlled values', () => {
    const rendered = renderNotification('booking_confirmed', appointment);
    expect(rendered?.html).not.toContain('<Test>');
    expect(rendered?.html).toContain('Amina &lt;Test&gt;');
  });

  it('should render an admin contact notification with a dashboard link', () => {
    const rendered = renderNotification('admin_contact_message', {
      kind: 'conversation',
      conversationId: 'conv-1',
      customerName: 'Amina',
      customerEmail: 'amina@example.com',
      subject: 'Question sur les tresses',
      message: 'Bonjour, je souhaite un devis.',
      adminLink: '/dashboard/messages/conv-1',
    });
    expect(rendered?.subject).toContain('Question sur les tresses');
    expect(rendered?.html).toContain('/dashboard/messages/conv-1');
    expect(rendered?.text).toContain('devis');
  });

  it('should render a custom request decision with price and proposed slot', () => {
    const rendered = renderNotification('custom_request_decision', {
      kind: 'custom',
      requestId: 'request-1',
      requesterName: 'Amina',
      requesterEmail: 'amina@example.com',
      description: 'Tresses personnalisées pour un mariage.',
      adminReply: 'Votre projet est réalisable.',
      estimatedPriceCents: 1500000,
      proposedServiceName: 'Tresses BOX',
      proposedSlot: '2026-11-20T09:00:00.000Z',
    });
    expect(rendered?.subject).toContain('demande');
    expect(rendered?.html).toMatch(/15[\s  ]000/);
    expect(rendered?.html).toContain('Tresses BOX');
    expect(rendered?.html).toContain('/reserver');
  });

  it('should return null for an unknown template or an empty payload', () => {
    expect(renderNotification('unknown_template', appointment)).toBeNull();
    expect(renderNotification('booking_confirmed', null)).toBeNull();
  });

  it('should know the supported templates', () => {
    expect(notificationTemplateExists('booking_reminder')).toBe(true);
    expect(notificationTemplateExists('conversation_reply')).toBe(true);
    expect(notificationTemplateExists('custom_request_decision')).toBe(true);
    expect(notificationTemplateExists('autre')).toBe(false);
  });
});

describe('renderNotification : contexte du salon', () => {
  const context = {
    signature: 'Sarielle <3>\nClausthal-Zellerfeld',
    cancellationPolicy: 'Annulation gratuite jusqu’à 48 heures avant.',
    bookingPolicy: 'Acompte de 5 000 EUR à la réservation.',
  };

  it('should append the escaped signature to html and text of any email', () => {
    const rendered = renderNotification('booking_confirmed', appointment, context);
    expect(rendered?.html).toContain('Sarielle &lt;3&gt;<br />Clausthal-Zellerfeld');
    expect(rendered?.html).not.toContain('Sarielle <3>');
    expect(rendered?.text.trimEnd().endsWith('Sarielle <3>\nClausthal-Zellerfeld')).toBe(true);
  });

  it('should sign admin and conversation emails too', () => {
    const admin = renderNotification('admin_new_booking', appointment, context);
    expect(admin?.html).toContain('Clausthal-Zellerfeld');
    const reply = renderNotification(
      'conversation_reply',
      { kind: 'conversation', customerName: 'A', subject: 'S', message: 'M' },
      context,
    );
    expect(reply?.text).toContain('Clausthal-Zellerfeld');
  });

  it('should show both policies in the confirmation email', () => {
    const rendered = renderNotification('booking_confirmed', appointment, context);
    expect(rendered?.html).toContain('Annulation gratuite jusqu’à 48 heures avant.');
    expect(rendered?.html).toContain('Acompte de 5 000 EUR');
    expect(rendered?.text).toContain('Acompte de 5 000 EUR');
    expect(rendered?.text).toContain('48 heures');
  });

  it('should escape policy text', () => {
    const rendered = renderNotification('booking_confirmed', appointment, {
      ...context,
      bookingPolicy: '<script>x</script>',
    });
    expect(rendered?.html).not.toContain('<script>');
    expect(rendered?.html).toContain('&lt;script&gt;');
  });

  it('should not add policies to other emails', () => {
    const rendered = renderNotification('booking_reminder', appointment, context);
    expect(rendered?.html).not.toContain('Acompte');
  });

  it('should still render without context', () => {
    const rendered = renderNotification('booking_confirmed', appointment);
    expect(rendered?.html).toContain('Tresses BOX');
    expect(rendered?.html).not.toContain('Clausthal-Zellerfeld');
  });
});

describe('renderNotification : assessment_decision', () => {
  const base = {
    kind: 'assessment',
    customerName: 'Amina <b>',
    serviceName: 'Départ de locs',
    message: 'Vos cheveux conviennent <i>parfaitement</i>.',
  };

  it('should know the template', () => {
    expect(notificationTemplateExists('assessment_decision')).toBe(true);
  });

  it('should render an accepted decision with a link to the catalogue and no booking promise', () => {
    const rendered = renderNotification('assessment_decision', { ...base, decision: 'ACCEPTED' });
    expect(rendered?.subject).toContain('Départ de locs');
    expect(rendered?.html).toContain('/coiffures');
    expect(rendered?.html).toContain('Amina &lt;b&gt;');
    expect(rendered?.html).toContain('&lt;i&gt;parfaitement&lt;/i&gt;');
    expect(rendered?.html).not.toContain('<i>');
    expect(rendered?.html).toMatch(/ne réserve pas|n’a pas été réservé|aucun rendez-vous/i);
    expect(rendered?.text).toContain('/coiffures');
  });

  it('should render a conditional decision with a catalogue link', () => {
    const rendered = renderNotification('assessment_decision', {
      ...base,
      decision: 'CONDITIONAL',
    });
    expect(rendered?.html).toContain('/coiffures');
    expect(rendered?.html.toLowerCase()).toContain('condition');
  });

  it('should render a refused decision without a booking link', () => {
    const rendered = renderNotification('assessment_decision', { ...base, decision: 'REFUSED' });
    expect(rendered?.html).not.toContain('/coiffures');
    expect(rendered?.html).toContain('parfaitement');
  });

  it('should render an info request without a booking link', () => {
    const rendered = renderNotification('assessment_decision', {
      ...base,
      decision: 'INFO_REQUESTED',
    });
    expect(rendered?.html).not.toContain('/coiffures');
  });

  it('should return null for an unknown decision or wrong template key', () => {
    expect(renderNotification('assessment_decision', { ...base, decision: 'WHATEVER' })).toBeNull();
    expect(renderNotification('booking_confirmed', { ...base, decision: 'ACCEPTED' })).toBeNull();
  });
});

describe('renderNotification : admin_assessment_received', () => {
  const payload = {
    kind: 'assessment',
    assessmentId: 'eval123',
    customerName: 'Amina <b>',
    customerEmail: 'amina@example.com',
    serviceName: 'Départ de locs',
  };

  it('should know the template', () => {
    expect(notificationTemplateExists('admin_assessment_received')).toBe(true);
  });

  it('should alert the admin with an escaped name and a link to the assessment', () => {
    const rendered = renderNotification('admin_assessment_received', payload);
    expect(rendered?.subject).toContain('Départ de locs');
    expect(rendered?.html).toContain('Amina &lt;b&gt;');
    expect(rendered?.html).toContain('/dashboard/evaluations/eval123');
    expect(rendered?.text).toContain('/dashboard/evaluations/eval123');
  });
});

describe('renderNotification : coiffure à domicile', () => {
  const home = {
    ...appointment,
    homeService: true,
    homeAddress: 'Mermoz, rue 12 <villa 4>',
    travelFeeCents: 500000,
  };
  const homeKeys = [
    'booking_received',
    'booking_confirmed',
    'booking_rescheduled',
    'booking_reminder',
    'admin_new_booking',
    'admin_booking_rescheduled',
  ];

  it.each(homeKeys)('should mention home service, address and fee in %s', (key) => {
    const rendered = renderNotification(key, home);
    expect(rendered?.html).toContain('À domicile');
    expect(rendered?.html).toContain('Mermoz, rue 12 &lt;villa 4&gt;');
    expect(rendered?.html).not.toContain('<villa 4>');
    expect(rendered?.html).toMatch(/5\s000/);
    expect(rendered?.text).toContain('domicile');
    expect(rendered?.text).toContain('Mermoz, rue 12 <villa 4>');
    expect(rendered?.text).toMatch(/5\s000/);
  });

  it('should not mention home service for a regular appointment', () => {
    const rendered = renderNotification('booking_confirmed', appointment);
    expect(rendered?.html).not.toContain('domicile');
    expect(rendered?.text).not.toContain('domicile');
  });

  it('should show a free travel fee explicitly instead of an empty amount', () => {
    const rendered = renderNotification('booking_confirmed', { ...home, travelFeeCents: 0 });
    expect(rendered?.html).toContain('Offerts');
  });
});

/* ---------- Allemand (payload.locale = 'de') ---------- */
const FRENCH_LEFTOVERS =
  /\b(bonjour|ton rendez-vous|ta r[ée]servation|tu peux|merci pour|paiement sur place|réserver|annul[ée]|créneau|prestation)\b/i;

const de = (extra: object) => ({ ...extra, locale: 'de' });

const CUSTOMER_CASES: Array<[string, object]> = [
  ['booking_received', de(appointment)],
  [
    'booking_confirmed',
    de({ ...appointment, cancelUrl: 'https://example.test/de/annulation/abc' }),
  ],
  ['booking_cancelled_customer', de(appointment)],
  ['booking_cancelled_admin', de(appointment)],
  ['booking_rescheduled', de(appointment)],
  ['booking_reminder', de(appointment)],
  [
    'contact_received',
    de({ kind: 'conversation', customerName: 'Amina', subject: 'Frage', message: 'Hallo' }),
  ],
  [
    'conversation_reply',
    de({ kind: 'conversation', customerName: 'Amina', subject: 'Frage', message: 'Antwort' }),
  ],
  [
    'custom_request_received',
    de({ kind: 'custom', requestId: 'r1', requesterName: 'Amina', description: 'Box Braids' }),
  ],
  [
    'custom_request_decision',
    de({
      kind: 'custom',
      requestId: 'r1',
      requesterName: 'Amina',
      description: 'x',
      adminReply: 'Gern!',
      estimatedPriceCents: 4550,
      proposedServiceName: 'Box Braids',
      proposedSlot: '2026-11-03T09:00:00.000Z',
    }),
  ],
  [
    'waitlist_slot_available',
    de({
      kind: 'waitlist',
      customerName: 'Amina',
      serviceName: 'Tresses BOX',
      startsAt: '2026-10-22T08:00:00.000Z',
      confirmUrl: 'https://example.test/de/liste-attente/tok',
      expiresAt: '2026-10-21T08:00:00.000Z',
    }),
  ],
  [
    'review_request',
    de({
      kind: 'review',
      customerName: 'Amina',
      serviceName: 'Tresses BOX',
      reviewUrl: 'https://example.test/de/avis/tok',
    }),
  ],
  ...(['ACCEPTED', 'CONDITIONAL', 'REFUSED', 'INFO_REQUESTED'] as const).map(
    (decision): [string, object] => [
      'assessment_decision',
      de({
        kind: 'assessment',
        customerName: 'Amina',
        serviceName: 'Tresses BOX',
        decision,
        message: 'Nachricht',
      }),
    ],
  ),
];

describe('renderNotification (de)', () => {
  it.each(CUSTOMER_CASES)('renders %s in German without French leftovers', (key, payload) => {
    const fr = renderNotification(key, { ...payload, locale: 'fr' });
    const rendered = renderNotification(key, payload);
    expect(rendered).not.toBeNull();
    expect(rendered?.subject).not.toBe(fr?.subject);
    expect(rendered?.html).toContain('<html lang="de">');
    for (const part of [rendered?.subject, rendered?.html, rendered?.text]) {
      expect(part).not.toMatch(FRENCH_LEFTOVERS);
    }
    expect(rendered?.text).toMatch(/Hallo|Erinnerung|Bewertung|Deine|Dein/);
  });

  it('defaults to French when locale is absent or unknown', () => {
    expect(renderNotification('booking_confirmed', appointment)?.subject).toBe(
      'Ton rendez-vous est confirmé',
    );
    expect(renderNotification('booking_confirmed', { ...appointment, locale: 'xx' })?.subject).toBe(
      'Ton rendez-vous est confirmé',
    );
    expect(payloadLocale({ locale: 'de' })).toBe('de');
    expect(payloadLocale(null)).toBe('fr');
  });

  it('uses German dates, informal tone and on-site payment wording', () => {
    const rendered = renderNotification('booking_confirmed', de(appointment));
    expect(rendered?.subject).toBe('Dein Termin ist bestätigt');
    expect(rendered?.html).toContain('Donnerstag, 22. Oktober 2026');
    expect(rendered?.html).toContain('Bezahlung vor Ort, bar oder per Überweisung');
    expect(rendered?.html).not.toMatch(/\bSie\b|\bIhr/);
    expect(rendered?.html).toContain('Amina &lt;Test&gt;');
  });

  it('uses German default policies unless Sarielle wrote her own', () => {
    const ctx = {
      cancellationPolicy: 'Tu peux annuler jusqu’à 30 minutes avant.',
      bookingPolicy: 'Texte FR',
      raw: { cancellationPolicy: null, bookingPolicy: null, minCancelNoticeMinutes: 90 },
    };
    const rendered = renderNotification('booking_confirmed', de(appointment), ctx);
    expect(rendered?.html).toContain('1 Std. 30 Min.');
    expect(rendered?.html).not.toContain('Texte FR');
    const custom = renderNotification('booking_confirmed', de(appointment), {
      ...ctx,
      raw: { cancellationPolicy: 'Eigene Regel', bookingPolicy: null, minCancelNoticeMinutes: 30 },
    });
    expect(custom?.html).toContain('Eigene Regel');
  });

  it('formats euros the German way and keeps /de links built from paths', () => {
    const rendered = renderNotification(
      'custom_request_decision',
      CUSTOMER_CASES.find(([k]) => k === 'custom_request_decision')![1],
    );
    expect(rendered?.html).toMatch(/45,50\s€/);
    expect(rendered?.html).toContain('/de/reserver');
    const home = renderNotification(
      'booking_confirmed',
      de({ ...appointment, homeService: true, homeAddress: 'Weg 1', travelFeeCents: 1500 }),
    );
    expect(home?.html).toMatch(/15\s€/);
    expect(home?.text).toContain('Anfahrtskosten');
  });

  it('keeps admin emails in French whatever the locale', () => {
    const rendered = renderNotification('admin_new_booking', de(appointment));
    expect(rendered?.subject).toContain('Nouvelle réservation');
  });

  it('has a German rendering for every customer template', () => {
    const customerKeys = [
      'booking_received',
      'booking_confirmed',
      'booking_cancelled_customer',
      'booking_cancelled_admin',
      'booking_rescheduled',
      'booking_reminder',
      'contact_received',
      'conversation_reply',
      'custom_request_received',
      'custom_request_decision',
      'waitlist_slot_available',
      'review_request',
      'assessment_decision',
    ];
    const covered = new Set(CUSTOMER_CASES.map(([k]) => k));
    for (const key of customerKeys) expect(covered.has(key), key).toBe(true);
  });
});
