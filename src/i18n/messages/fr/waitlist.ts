/* Liste d'attente : inscription (/liste-attente) et confirmation par lien (/liste-attente/[token]). */
export const waitlist = {
  meta: {
    title: 'Liste d’attente',
    description: 'Sois prévenue par e-mail si un créneau se libère pour la prestation souhaitée.',
  },
  title: 'Liste d’attente',
  intro: 'Tu seras prévenue par e-mail si ce créneau se libère.',
  form: {
    service: 'Prestation souhaitée',
    date: 'Date souhaitée',
    time: 'Heure souhaitée',
    name: 'Nom et prénom',
    email: 'E-mail',
    phone: 'Téléphone',
    submit: 'Rejoindre la liste d’attente',
  },
  confirm: {
    meta: { title: 'Confirmer ma réservation' },
    invalidTitle: 'Lien invalide',
    invalidText: 'Ce lien ne correspond à aucune demande de liste d’attente.',
    alreadyTitle: 'Déjà confirmée',
    expiredTitle: 'Lien expiré',
    alreadyText: 'Cette réservation a déjà été confirmée.',
    expiredText:
      'Ce lien a expiré. La place a été proposée à la personne suivante sur la liste d’attente.',
    freedTitle: 'Une place s’est libérée pour « {service} »',
    slotBefore: 'Créneau du',
    name: 'Nom et prénom',
    email: 'E-mail',
    phone: 'Téléphone',
    submit: 'Confirmer ma réservation',
    reference: 'Référence : {reference}.',
  },
};
