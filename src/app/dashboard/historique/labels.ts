import { ASSESSMENT_DECISION_LABELS } from '@/modules/compatibilite/schemas';
import { CUSTOM_REQUEST_STATUS_LABELS } from '@/modules/demandes/queries';
import { APPOINTMENT_STATUS_LABELS } from '@/modules/reservations/status';

/* Libellés lisibles du journal d'audit. Action inconnue : repli lisible (jamais le code brut seul). */

const EXACT: Record<string, string> = {
  'category.create': 'Création de catégorie',
  'category.update': 'Modification de catégorie',
  'category.delete': 'Suppression de catégorie',
  'category.publish': 'Activation de catégorie',
  'category.unpublish': 'Désactivation de catégorie',
  'category.reorder': 'Réordonnancement des catégories',
  'service.create': 'Création de prestation',
  'service.update': 'Modification de prestation',
  'service.publish': 'Publication de prestation',
  'service.unpublish': 'Dépublication de prestation',
  'service.archive': 'Archivage de prestation',
  'service.delete': 'Suppression de prestation',
  'service.option.create': "Ajout d'une option",
  'service.option.update': "Modification d'une option",
  'service.option.delete': "Suppression d'une option",
  'service.option.publish': "Activation d'une option",
  'service.option.unpublish': "Désactivation d'une option",
  'service.image.upload': 'Ajout de photo',
  'service.image.alt': 'Texte alternatif de photo',
  'service.image.primary': 'Photo principale',
  'service.image.delete': 'Suppression de photo',
  'service.image.reorder': 'Réordonnancement des photos',
  'service.compatibility.update': 'Règles de compatibilité',
  'service.question.create': 'Ajout de question',
  'service.question.update': 'Modification de question',
  'service.question.delete': 'Suppression de question',
  'service.question.reorder': 'Réordonnancement des questions',
  'appointment.create': 'Nouveau rendez-vous',
  'appointment.reschedule': 'Rendez-vous reprogrammé',
  'appointment.cancel_customer': 'Rendez-vous annulé par la cliente',
  'appointment.cancel_admin': 'Rendez-vous annulé par Sarielle',
  'appointment.auto_expire': 'Rendez-vous expiré (non confirmé)',
  'availability.weekly.update': 'Horaires hebdomadaires modifiés',
  'availability.specific.update': 'Horaire exceptionnel modifié',
  'availability.specific.delete': 'Horaire exceptionnel supprimé',
  'availability.block.create': 'Période bloquée ajoutée',
  'availability.block.delete': 'Période bloquée supprimée',
  'availability.settings.update': 'Réglages de réservation modifiés',
  'settings.profile.update': 'Profil de Sarielle modifié',
  'customer.contact.update': 'Coordonnées de cliente modifiées',
  'customer.export': 'Export des données d’une cliente (RGPD)',
  'customer.anonymize': 'Fiche cliente anonymisée (RGPD)',
  'conversation.reply': 'Réponse envoyée à une cliente',
  'conversation.internal_note': 'Note interne ajoutée',
  'conversation.status': 'Statut de conversation modifié',
  'conversation.delete': 'Conversation supprimée',
  'assessment.submit': 'Évaluation capillaire reçue',
  'notification.retry': 'Envoi d’e-mail relancé',
  'promotion.create': 'Promotion créée',
  'promotion.toggle': 'Promotion activée / désactivée',
  'promotion.delete': 'Promotion supprimée',
  'gallery.upload': 'Photo ajoutée à la galerie',
  'gallery.update': 'Photo de galerie modifiée',
  'gallery.delete': 'Photo de galerie supprimée',
  'review.delete': 'Avis supprimé',
};

const ENTITY_LABELS: Record<string, string> = {
  Category: 'Catégorie',
  Service: 'Prestation',
  ServiceImage: 'Photo de prestation',
  ServiceOption: 'Option',
  CompatibilityRule: 'Compatibilité',
  QuestionDefinition: 'Question',
  Appointment: 'Rendez-vous',
  AvailabilityRule: 'Disponibilité',
  BlockedPeriod: 'Période bloquée',
  Customer: 'Cliente',
  Conversation: 'Conversation',
  CustomRequest: 'Demande',
  HairAssessment: 'Évaluation',
  Review: 'Avis',
  Promotion: 'Promotion',
  GalleryPhoto: 'Galerie',
  SalonSettings: 'Réglages',
  Notification: 'Notification',
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

export function actionLabel(action: string): string {
  const exact = EXACT[action];
  if (exact) return exact;

  const [domain, ...rest] = action.split('.');
  const tail = rest.join('.');
  const upper = tail.toUpperCase();
  if (domain === 'appointment') {
    const label = APPOINTMENT_STATUS_LABELS[upper as keyof typeof APPOINTMENT_STATUS_LABELS];
    if (label) return `Rendez-vous : ${label.toLowerCase()}`;
  }
  if (domain === 'custom_request' && tail.startsWith('decision.')) {
    const key = tail.slice('decision.'.length).toUpperCase();
    const label = CUSTOM_REQUEST_STATUS_LABELS[key as keyof typeof CUSTOM_REQUEST_STATUS_LABELS];
    if (label) return `Demande : ${label.toLowerCase()}`;
  }
  if (domain === 'assessment' && tail.startsWith('decision.')) {
    const key = tail.slice('decision.'.length).toUpperCase();
    const label = ASSESSMENT_DECISION_LABELS[key as keyof typeof ASSESSMENT_DECISION_LABELS];
    if (label) return `Évaluation : ${label.toLowerCase()}`;
  }
  const human = action.replace(/[._]/g, ' ');
  return human.charAt(0).toUpperCase() + human.slice(1);
}

/* Page de l'élément concerné, si elle existe encore (jamais pour une suppression / anonymisation de page). */
export function entityHref(
  entityType: string,
  entityId: string | null,
  action: string,
): string | null {
  if (!entityId || /\.delete$/.test(action)) return null;
  switch (entityType) {
    case 'Appointment':
      return `/dashboard/reservations/${entityId}`;
    case 'Customer':
      return `/dashboard/clients/${entityId}`;
    case 'Conversation':
      return `/dashboard/messages/${entityId}`;
    case 'HairAssessment':
      return `/dashboard/evaluations/${entityId}`;
    case 'CustomRequest':
      return `/dashboard/demandes/${entityId}`;
    case 'Service':
      return `/dashboard/catalogue/prestations/${entityId}`;
    default:
      return null;
  }
}
