/* E-mails transactionnels envoyés au CLIENT (les e-mails admin_* restent en français dans templates.ts).
   Paramètres : {name} {service} {when} {url} {expires} {subject}. */
export const emails = {
  salon: 'Sarielle Fashion',
  dateTbd: 'date à confirmer',
  paymentShort: 'Paiement sur place, en espèces ou par virement.',
  thanks: 'Merci pour ta confiance.',
  hello: 'Bonjour {name},',
  yourService: 'ta prestation',
  free: 'Offerts',
  notSpecified: 'Non précisée',
  row: {
    service: 'Prestation',
    dateTime: 'Date et heure',
    location: 'Lieu',
    atHome: 'À domicile',
    address: 'Adresse',
    travelFee: 'Frais de déplacement',
    reason: 'Motif',
    subject: 'Sujet',
    desiredDate: 'Date souhaitée',
    estimatedPrice: 'Prix estimé',
    proposedService: 'Prestation proposée',
    proposedSlot: 'Créneau proposé',
    slot: 'Créneau',
  },
  text: {
    dateLabel: 'Date : {when}',
    homeLocation: 'Lieu : à domicile{address}',
    travelFee: 'Frais de déplacement : {fee}',
    manageLink: 'Gérer mon rendez-vous : {url}',
    policyLine: '{title} : {text}',
    priceLine: 'Prix estimé : {price}',
    proposedServiceLine: 'Prestation proposée : {service}',
  },
  policy: {
    cancellation: 'Annulation',
    booking: 'Conditions de réservation',
    cancelDefaultNotice:
      'Tu peux annuler ton rendez-vous gratuitement jusqu’à {delay} avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai, le lien ne fonctionne plus : contacte Sarielle directement.',
    cancelDefault:
      'Tu peux annuler ton rendez-vous via le lien sécurisé reçu par e-mail. En cas de difficulté, contacte Sarielle directement.',
    bookingDefault:
      'Les rendez-vous se prennent uniquement sur réservation. Le paiement se fait toujours sur place, en espèces ou par virement. Merci de respecter l’heure convenue.',
    delayMinutes: { one: '{n} minute', other: '{n} minutes' },
    delayHours: { one: '{n} heure', other: '{n} heures' },
    delayHoursMinutes: '{h} h {m}',
  },
  bookingReceived: {
    subject: 'Ta demande de rendez-vous est enregistrée',
    title: 'Ton rendez-vous est enregistré',
    intro:
      'Bonjour {name}, ta réservation pour {service} a bien été enregistrée. Sarielle confirmera ton créneau si nécessaire.',
    note: 'Tu recevras une confirmation dès que le rendez-vous sera validé.',
    text: 'Ta réservation pour {service} est enregistrée.',
  },
  bookingConfirmed: {
    subject: 'Ton rendez-vous est confirmé',
    title: 'Ton rendez-vous est confirmé',
    intro: 'Bonjour {name}, ton rendez-vous pour {service} est confirmé.',
    cta: 'Gérer ou annuler mon rendez-vous',
    note: 'Conserve ce message pour retrouver ton rendez-vous.',
    text: 'Ton rendez-vous pour {service} est confirmé le {when}.',
  },
  bookingCancelled: {
    subject: 'Ton rendez-vous est annulé',
    title: 'Ton rendez-vous est annulé',
    intro: 'Bonjour {name}, ton rendez-vous pour {service} a été annulé.',
    introByAdmin: 'Bonjour {name}, ton rendez-vous pour {service} a été annulé par Sarielle.',
    paragraph: 'Le créneau a été libéré. Tu peux réserver un nouveau rendez-vous depuis le site.',
    cta: 'Réserver un nouveau créneau',
    text: 'Ton rendez-vous pour {service} du {when} a été annulé.\nTu peux réserver un nouveau créneau : {url}',
  },
  bookingRescheduled: {
    subject: 'Ton rendez-vous est reprogrammé',
    title: 'Ton rendez-vous est reprogrammé',
    intro:
      'Bonjour {name}, ton rendez-vous pour {service} a été déplacé au nouveau créneau ci-dessous.',
    cta: 'Gérer ou annuler mon rendez-vous',
    text: 'Ton rendez-vous pour {service} est reprogrammé : {when}.',
  },
  bookingReminder: {
    subject: 'Rappel : ton rendez-vous approche',
    title: 'Ton rendez-vous approche',
    intro: 'Bonjour {name}, un rappel pour ton rendez-vous pour {service}.',
    cta: 'Voir mon rendez-vous',
    note: 'En cas d’empêchement, utilise le lien reçu avec ta confirmation.',
    text: 'Rappel : rendez-vous pour {service} le {when}.',
  },
  contactReceived: {
    subject: 'Ton message a bien été reçu',
    title: 'Message bien reçu',
    intro: 'Bonjour {name}, Sarielle a bien reçu ton message et te répondra personnellement.',
    note: 'Tu peux répondre directement à cet e-mail.',
    text: 'Ton message « {subject} » a bien été reçu. Sarielle te répondra personnellement.',
  },
  conversationReply: {
    subject: 'Réponse à ton message : {subject}',
    title: 'Réponse de Sarielle',
    intro: 'Bonjour {name}, voici la réponse à ton message.',
    note: 'Tu peux répondre directement à cet e-mail.',
  },
  customRequestReceived: {
    subject: 'Ta demande de coiffure personnalisée a bien été reçue',
    title: 'Demande bien reçue',
    intro:
      'Bonjour {name}, Sarielle a bien reçu ta demande de coiffure personnalisée et te répondra personnellement.',
    note: 'Cette demande ne réserve pas encore de créneau. Sarielle te proposera une prestation ou un rendez-vous adapté.',
    text: 'Ta demande de coiffure personnalisée a bien été reçue. Sarielle te répondra personnellement.',
  },
  customRequestDecision: {
    subject: 'Réponse à ta demande de coiffure personnalisée',
    title: 'Réponse de Sarielle',
    intro: 'Bonjour {name}, voici la réponse à ta demande de coiffure personnalisée.',
    cta: 'Réserver un créneau',
    note: 'Une proposition de créneau ne réserve pas automatiquement le rendez-vous : la réservation reste nécessaire.',
  },
  waitlist: {
    subject: 'Une place s’est libérée : {service}',
    title: 'Un créneau s’est libéré',
    intro: 'Bonjour {name}, le créneau que tu attendais pour {service} vient de se libérer.',
    cta: 'Confirmer ma réservation',
    note: 'Ce lien est valable jusqu’au {expires}. Passé ce délai, la place sera proposée à la personne suivante.',
    text: 'Le créneau du {when} pour {service} est disponible.\nConfirme ta réservation : {url}\nLien valable jusqu’au {expires}.',
  },
  review: {
    subject: 'Ton avis compte pour Sarielle',
    title: 'Comment s’est passé ton rendez-vous ?',
    intro:
      'Bonjour {name}, Sarielle espère que ta prestation « {service} » t’a plu. Ton avis aide d’autres clientes à faire leur choix.',
    cta: 'Laisser un avis',
    note: 'Ton avis est publié sur le site dès son envoi, avec la mention « client vérifié ».',
    text: 'Ton avis sur {service} compte pour Sarielle.\nLaisser un avis : {url}',
  },
  assessment: {
    catalogue: 'Catalogue : {url}',
    cta: 'Choisir ma coiffure et réserver',
    noteBook:
      'Cette réponse ne réserve aucun rendez-vous : choisis ta coiffure et ton créneau depuis le catalogue.',
    noteInfo:
      'Aucun rendez-vous n’est réservé. Réponds à cet e-mail ou contacte Sarielle depuis le site.',
    accepted: {
      subject: 'Évaluation acceptée : {service}',
      title: 'Ton évaluation est acceptée',
      intro:
        'Bonjour {name}, Sarielle a étudié ton évaluation pour « {service} » : ta chevelure est compatible.',
    },
    conditional: {
      subject: 'Évaluation acceptée sous conditions : {service}',
      title: 'Évaluation acceptée sous conditions',
      intro:
        'Bonjour {name}, Sarielle a étudié ton évaluation pour « {service} » : la prestation est possible sous conditions, détaillées ci-dessous.',
    },
    refused: {
      subject: 'Réponse à ton évaluation : {service}',
      title: 'Réponse à ton évaluation',
      intro:
        'Bonjour {name}, Sarielle a étudié ton évaluation pour « {service} ». Cette prestation ne peut malheureusement pas être réalisée dans ta situation.',
    },
    infoRequested: {
      subject: 'Précisions demandées : {service}',
      title: 'Sarielle a besoin de précisions',
      intro:
        'Bonjour {name}, Sarielle a étudié ton évaluation pour « {service} » et souhaite quelques précisions avant de se prononcer.',
    },
  },
};
