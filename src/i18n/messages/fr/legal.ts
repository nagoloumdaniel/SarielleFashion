/* Mentions légales et politique de confidentialité. */
export const legal = {
  actions: { contact: 'Me contacter', contactUs: 'Nous contacter', catalogue: 'Voir le catalogue' },
  imprint: {
    meta: {
      title: 'Mentions légales',
      description:
        'Mentions légales de Sarielle Fashion : identité, coordonnées, hébergement et publication du site.',
    },
    title: 'Mentions légales',
    publisher: {
      title: '1. Éditeur du site',
      legalName: 'Nom légal et marque',
      activity: 'Activité',
      activityValue: 'Coiffure, make-up, pose de lace, pose de cils.',
      contact: 'Adresse et contact',
      address: 'Clausthal-Zellerfeld, Allemagne',
      email: 'E-mail :',
    },
    hosting: {
      title: '2. Hébergement',
      text: 'Ce site est hébergé par Vercel Inc. (vercel.com, États-Unis), plateforme de cloud publique.',
    },
    publication: {
      title: '3. Publication et contenus',
      text: 'La directrice de la publication est Sarielle, gérante de Sarielle Fashion. Les textes, photos et visuels du site sont la propriété de Sarielle ou utilisés avec l’autorisation de leurs auteurs. Toute reproduction est interdite sans accord écrit.',
    },
    data: {
      title: '4. Données personnelles',
      before: 'Les données collectées via ce site font l’objet d’un traitement décrit dans la',
      link: 'politique de confidentialité',
      after:
        '. Conformément au RGPD (DSGVO), tu disposes d’un droit d’accès, de rectification, de suppression et d’opposition sur tes données. Pour exercer ces droits, écris à',
    },
    question: 'Une question ?',
  },
  privacy: {
    meta: {
      title: 'Politique de confidentialité (RGPD / DSGVO)',
      description:
        'Politique de confidentialité de Sarielle Fashion : données collectées, finalités, conservation, droits et cookies.',
    },
    breadcrumb: 'Politique de confidentialité',
    title: 'Politique de confidentialité',
    controller: {
      title: '1. Responsable du traitement',
      text: 'Sarielle Fashion (Sarielle, gérante) est responsable du traitement des données personnelles collectées sur ce site. Contact :',
    },
    collected: {
      title: '2. Données collectées',
      items: [
        'Formulaire de contact : nom, e-mail, téléphone (facultatif), sujet, message.',
        'Compte client et réservations : coordonnées, historique des rendez-vous et prestations.',
        'Évaluation capillaire (photos) : uniquement avec votre consentement, stockées en privé, jamais publiées dans la galerie publique.',
        'Données techniques : adresse IP (rate limiter du formulaire de contact, pas de profilage), cookies de session si authentification dashboard.',
      ],
    },
    purposes: {
      title: '3. Finalités et base légale',
      purpose: 'Finalité',
      basis: 'Base légale',
      rows: [
        ['Répondre à vos messages (contact)', 'Votre consentement'],
        ['Gérer vos rendez-vous et prestations', 'Exécution du contrat'],
        ['Protéger le formulaire contre les spams', 'Intérêt légitime de Sarielle'],
        ['Évaluer la compatibilité capillaire', 'Votre consentement'],
      ],
    },
    retention: {
      title: '4. Durée de conservation',
      messages: 'Messages de contact : 12 mois maximum après la dernière réponse.',
      customers:
        'Données clientes et historique : {months} mois maximum, puis anonymisation ou suppression.',
      booking:
        'Données de réservation et client : durée de la relation client + délais légaux (facturation).',
      photos:
        'Photos privées d’évaluation et de demande : {days} jours maximum, puis purge automatique.',
      ip: 'Adresse IP (rate limiter) : conservé le temps de la fenêtre de rate limiting, puis supprimé.',
    },
    recipients: {
      title: '5. Destinataires et sous-traitants',
      text: 'Vos données ne sont ni vendues ni louées. Elles peuvent être transmises à des prestataires techniques strictement nécessaires au fonctionnement du site : hébergement, base de données, envoi d’e-mails (confirmation de réservation), et analytics si activés. Chaque prestataire est contractuellement engagé à respecter la confidentialité et la sécurité des données (DPA).',
    },
    rights: {
      title: '6. Vos droits (RGPD / DSGVO)',
      intro: 'Conformément au RGPD, vous pouvez exercer gratuitement les droits suivants :',
      items: [
        'Accéder aux données vous concernant.',
        'Demander la rectification de données inexactes ou incomplètes.',
        'Demander la suppression de vos données (droit à l’oubli), sous réserve des obligations légales de conservation.',
        'Vous opposer au traitement de vos données pour des raisons tenant à votre situation particulière.',
        'Demander la portabilité de vos données.',
        'Retirer votre consentement à tout moment, sans effet sur la légalité du traitement passé.',
      ],
      before: 'Pour exercer ces droits ou poser une question, écrivez à',
      after:
        '. Une pièce d’identité peut vous être demandée pour prévenir tout abus. En cas de désaccord persistant, vous pouvez introduire une réclamation auprès de l’autorité de protection des données compétente, en Basse-Saxe : Die Landesbeauftragte für den Datenschutz Niedersachsen (lfd.niedersachsen.de).',
    },
    cookies: {
      title: '7. Cookies et traceurs',
      text: 'Ce site peut utiliser des cookies strictement nécessaires à son fonctionnement (session du tableau de bord, protection du formulaire de contact, mémorisation de la langue choisie). Aucun cookie de traçage publicitaire n’est déposé sans votre consentement préalable. Vous pouvez configurer ou désactiver les cookies depuis votre navigateur.',
    },
    security: {
      title: '8. Sécurité',
      text: 'Sarielle met en œuvre des mesures de sécurité adaptées pour protéger vos données contre toute destruction, perte, altération ou accès non autorisé : authentification protégée, mots de passe hashés et validation des entrées côté serveur.',
    },
    exercise: 'Exercer vos droits',
  },
};
