import { BOOKING_GUARD_MESSAGES } from '@/modules/compatibilite/booking-guard';
import { COMPATIBILITY_MESSAGES } from '@/modules/compatibilite/engine';
import {
  HAIR_LENGTH_OPTIONS,
  HAIR_TYPE_OPTIONS,
  LOCS_OPTIONS,
  QUESTION_TEXT,
  YES_NO_OPTIONS,
} from '@/modules/compatibilite/questions';

/* Messages serveur fr -> de : parcours de compatibilité capillaire.
 * Les clés issues de constantes du module sont calculées pour rester exactes. */
const M = COMPATIBILITY_MESSAGES;
const G = BOOKING_GUARD_MESSAGES;

const hairLengthDe: Record<string, string> = {
  SHORT: 'Kurzes Haar',
  MEDIUM: 'Mittellang',
  LONG: 'Lang',
  VERY_LONG: 'Sehr lang',
  UNSURE: 'Ich bin nicht sicher',
};
const locsDe: Record<string, string> = {
  YES: 'Ja, ich trage Locs',
  NO: 'Nein, ich trage keine Locs',
  UNSURE: 'Ich bin nicht sicher',
};
const hairTypeDe: Record<string, string> = {
  'Cheveux naturels fins': 'Feines Naturhaar',
  'Cheveux naturels épais': 'Dickes Naturhaar',
  'Cheveux bouclés': 'Lockiges Haar',
  'Cheveux crépus': 'Krauses Haar (Afro-Struktur)',
  'Cheveux défrisés': 'Geglättetes Haar',
  Autre: 'Sonstiges',
  'Je ne sais pas': 'Ich weiß es nicht',
};

export const compat: Record<string, string> = {
  // Moteur de compatibilité
  [M.compatible]: 'Deine Angaben zum Haar passen zu dieser Leistung.',
  [M.length]:
    'Für diese Frisur ist eine ausreichende Haarlänge nötig. Nach deiner Antwort ist sie möglicherweise nicht geeignet. Du kannst ein Foto deiner Haare senden, damit Sarielle prüft, ob die Leistung machbar ist.',
  [M.locsRequired]:
    'Für diese Leistung sind bereits vorhandene Locs nötig. Wenn das bei dir nicht der Fall ist, kann sie nicht durchgeführt werden.',
  [M.locsIncompatible]:
    'Diese Leistung ist auf Haaren, die als Locs getragen werden, nicht möglich.',
  [M.shortCut]:
    'Ein sehr kurzer Haarschnitt oder eine rasierte Stelle kann diese Leistung unmöglich machen. Sende ein Foto, damit Sarielle es prüfen kann.',
  [M.hairType]: 'Dein Haartyp muss vor der Buchung von Sarielle geprüft werden.',
  [M.unsureLength]:
    'Du hast angegeben, dass du dir bei der Haarlänge nicht sicher bist. Sende ein Foto, damit Sarielle die Kompatibilität beurteilen kann.',
  [M.unsureLocs]:
    'Du hast angegeben, dass du dir nicht sicher bist, ob du Locs trägst. Sende ein Foto, damit Sarielle es prüfen kann.',
  [M.missing]:
    'Beantworte die Fragen zu deinem Haar, damit die Kompatibilität beurteilt werden kann.',
  [M.manualReview]:
    'Deine Antworten passen zu dieser Leistung. Sarielle muss die Angaben vor der Buchung bestätigen.',
  [M.photoRequired]: 'Vor der Buchung ist ein Foto deiner Haare nötig.',

  // Garde de réservation
  [G.accepted]: 'Die Haarbeurteilung wurde von Sarielle akzeptiert.',
  [G.refused]: 'Diese Haarbeurteilung wurde abgelehnt.',
  [G.infoRequested]: 'Vor der Buchung werden noch weitere Informationen benötigt.',
  [G.awaiting]: 'Die Haarbeurteilung wartet auf die Entscheidung von Sarielle.',

  // Questions de base et options
  [QUESTION_TEXT.hairLength]: 'Wie lang sind deine Haare aktuell?',
  [QUESTION_TEXT.shortCut]: 'Hast du einen sehr kurzen Haarschnitt oder eine rasierte Stelle?',
  [QUESTION_TEXT.shortCutHelp]: 'Dadurch sind manche Frisuren eventuell nicht möglich.',
  [QUESTION_TEXT.hasLocs]: 'Trägst du aktuell Locs?',
  [QUESTION_TEXT.hairType]: 'Welchen Haartyp hast du?',
  [QUESTION_TEXT.notProvided]: 'Nicht angegeben',
  ...Object.fromEntries(
    HAIR_LENGTH_OPTIONS.map((o) => [o.label, hairLengthDe[o.value] ?? o.label]),
  ),
  ...Object.fromEntries(LOCS_OPTIONS.map((o) => [o.label, locsDe[o.value] ?? o.label])),
  ...Object.fromEntries(HAIR_TYPE_OPTIONS.map((o) => [o, hairTypeDe[o] ?? o])),
  ...Object.fromEntries(YES_NO_OPTIONS.map((o) => [o.label, o.value === 'YES' ? 'Ja' : 'Nein'])),

  // Validation (schémas) et actions
  'Prestation manquante.': 'Die Leistung fehlt.',
  'Trop de réponses transmises.': 'Es wurden zu viele Antworten übermittelt.',
  'Indiquez votre nom.': 'Bitte gib deinen Namen an.',
  'Le nom est trop long.': 'Der Name ist zu lang.',
  'Adresse e-mail invalide.': 'Ungültige E-Mail-Adresse.',
  'Numéro de téléphone trop court.': 'Die Telefonnummer ist zu kurz.',
  'Numéro de téléphone trop long.': 'Die Telefonnummer ist zu lang.',
  'Numéro de téléphone invalide.': 'Ungültige Telefonnummer.',
  'Le commentaire est limité à 1000 caractères.': 'Der Kommentar ist auf 1000 Zeichen begrenzt.',
  'Vous devez accepter l’utilisation de vos informations.':
    'Du musst der Verwendung deiner Angaben zustimmen.',
  'Trop de demandes. Réessayez dans une minute.':
    'Zu viele Anfragen. Versuch es in einer Minute erneut.',
  'Réponses illisibles.': 'Die Antworten konnten nicht gelesen werden.',
  'Cette prestation n’est plus disponible.': 'Diese Leistung ist nicht mehr verfügbar.',
  'Répondez aux questions obligatoires avant de continuer.':
    'Beantworte bitte die Pflichtfragen, bevor du weitermachst.',
  'Trop de demandes envoyées. Réessayez dans quelques minutes.':
    'Zu viele Anfragen gesendet. Versuch es in einigen Minuten erneut.',
  'Demande refusée.': 'Anfrage abgelehnt.',
  'Ajoutez une photo de vos cheveux pour cette prestation.':
    'Füge für diese Leistung ein Foto deiner Haare hinzu.',
  'Impossible d’envoyer la photo. Réessayez plus tard.':
    'Das Foto konnte nicht gesendet werden. Versuch es später noch einmal.',
  'L’enregistrement de la demande a échoué. Réessayez plus tard.':
    'Die Anfrage konnte nicht gespeichert werden. Versuch es später noch einmal.',
};
