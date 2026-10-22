/* Informations pratiques. */
export const info = {
  meta: {
    title: 'Informations pratiques',
    description:
      "Horaires, préparation du rendez-vous et politique d'annulation de Sarielle Fashion.",
  },
  title: 'Informations pratiques',
  contact: {
    title: 'Coordonnées',
    address: 'Adresse',
    defaultAddress: 'Clausthal-Zellerfeld\nAllemagne',
    homeService: 'Coiffure à domicile',
    email: 'E-mail',
  },
  hours: {
    title: 'Horaires',
    note: "Sur réservation uniquement. Merci d'être à l'heure.",
  },
  preparation: {
    title: 'Préparer ton rendez-vous',
    items: [
      'Viens avec des cheveux propres, démêlés et séchés.',
      'Si tu portes une coiffure existante, ne la défais pas la veille.',
      'Apporte une photo ou une inspiration du résultat souhaité si tu en as une.',
    ],
  },
  payment: {
    title: 'Paiement',
    sentence:
      'Le paiement se fait toujours sur place, le jour du rendez-vous, en espèces ou par virement. Aucun paiement en ligne n’est demandé.',
  },
  booking: {
    title: 'Conditions de réservation',
    defaultPolicy:
      'Les rendez-vous se prennent uniquement sur réservation. Le paiement se fait toujours sur place, en espèces ou par virement. Merci de respecter l’heure convenue.',
  },
  homeService: {
    withFee:
      'Coiffure à domicile possible en option, frais de déplacement à ta charge : à partir de {fee}.',
    free: 'Coiffure à domicile possible en option, sans frais de déplacement.',
  },
  cancellation: {
    title: "Politique d'annulation",
    noDelay: 'le délai prévu',
    onTime: {
      label: 'Annulation à temps',
      description:
        'Tu peux annuler ton rendez-vous gratuitement en ligne jusqu’à {delay} avant l’heure convenue, via le lien sécurisé reçu par e-mail.',
    },
    late: {
      label: 'Annulation tardive',
      description:
        'Passé le délai de {delay}, le lien d’annulation ne fonctionne plus et le créneau ne peut plus être proposé à d’autres personnes. Contacte Sarielle directement pour étudier ta situation.',
    },
    absence: {
      label: 'Absence',
      description:
        'En cas d’absence sans préavis, Sarielle se réserve le droit de demander un acompte pour toute réservation ultérieure.',
    },
    bySarielle: {
      label: 'Annulation par Sarielle',
      description:
        'Si Sarielle doit annuler pour un motif personnel (maladie, urgence), je te contacte sans délai et un nouveau rendez-vous t’est proposé en priorité, sans frais.',
    },
  },
  delay: {
    minutes: { one: '{count} minute', other: '{count} minutes' },
    hours: { one: '{count} heure', other: '{count} heures' },
    hoursMinutes: '{h} h {m}',
  },
  question: {
    title: 'Une question ?',
    contact: 'Nous contacter',
    book: 'Réserver un créneau',
  },
};
