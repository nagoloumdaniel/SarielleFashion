/* FAQ : questions fixes (l'option à domicile est ajoutée dynamiquement par la page). */
export const faq = {
  meta: {
    title: 'Questions fréquentes (FAQ)',
    description:
      "Questions fréquentes sur les prestations, la réservation, l'annulation et les cheveux avec Sarielle Fashion.",
  },
  breadcrumb: 'FAQ',
  title: 'Vos questions, nos réponses',
  listLabel: 'Liste des questions fréquentes',
  other: 'Une autre question ?',
  contact: 'Nous contacter',
  catalogue: 'Voir le catalogue',
  items: [
    {
      id: 'reservation',
      title: 'Comment réserver un rendez-vous ?',
      content:
        'Parcours le catalogue, sélectionne la prestation qui te convient, réponds aux éventuelles questions de compatibilité, puis choisis ta date et ton heure. Tu reçois un e-mail de confirmation avec un lien de suivi sécurisé.',
    },
    {
      id: 'delai',
      title: 'Combien de temps à l’avance faut-il réserver ?',
      content:
        'Je te recommande de réserver au moins une semaine à l’avance, surtout pour les coiffures longues et les événements. Des créneaux de dernière minute restent parfois disponibles : contacte-moi pour vérifier.',
    },
    {
      id: 'cheveux',
      title: 'Quels types de cheveux coiffes-tu ?',
      content:
        'Je coiffe les femmes, les hommes et les enfants, et je réalise aussi du make-up, de la pose de lace et de cils. Chaque prestation est adaptée à ta nature de cheveux.',
    },
    {
      id: 'preparation',
      title: 'Comment préparer mes cheveux avant le rendez-vous ?',
      content:
        'Viens avec des cheveux propres, démêlés et séchés. Si tu as une coiffure existante, ne la défais pas la veille : je m’en occupe au début du rendez-vous.',
    },
    {
      id: 'duree',
      title: 'Combien de temps dure une prestation ?',
      content:
        'La durée dépend de la prestation et de ta longueur de cheveux. Chaque fiche du catalogue indique une durée indicative ; la durée réelle est confirmée avant de commencer.',
    },
    {
      id: 'prix',
      title: 'Comment sont fixés les prix ?',
      content:
        'Les prix dépendent de la longueur, de la densité et de la complexité de la coiffure. Le catalogue affiche un prix de départ ou une fourchette. Le tarif final est toujours confirmé avant de commencer la prestation.',
    },
  ],
  payment: {
    title: 'Comment et quand puis-je payer ?',
    suffix: 'Le tarif final est confirmé avant de commencer la prestation.',
  },
  cancellation: {
    title: 'Quelle est la politique d’annulation ?',
    content:
      'Tu peux annuler ton rendez-vous gratuitement en ligne jusqu’à 30 minutes avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai, le lien ne fonctionne plus : contacte Sarielle directement. Les conditions détaillées dans les informations pratiques s’appliquent.',
  },
  options: {
    title: 'Puis-je ajouter des options à ma prestation ?',
    content:
      'Oui, la plupart des prestations proposent des options (soins, longueurs supplémentaires, motifs personnalisés). Tu les sélectionnes lors de la réservation ; elles influencent le prix et la durée.',
  },
  homeService: {
    title: 'Te déplaces-tu à domicile ?',
    suffix: 'Sinon, je te reçois sur rendez-vous à Clausthal-Zellerfeld.',
  },
};
