import { after } from 'next/server';
import { processPendingEmails } from './service';

/* Envoie les e-mails en attente juste après la réponse à l'utilisateur
   (réservation, contact, demande, message, avis, liste d'attente).
   Les crons restent un filet de sécurité pour les reprises et rappels. */
export function flushEmailsSoon(): void {
  try {
    after(async () => {
      try {
        await processPendingEmails({ limit: 25 });
      } catch (error) {
        console.error('[email] envoi immédiat impossible', error);
      }
    });
  } catch {
    // Hors contexte de requête (tests, scripts) : le cron prendra le relais.
  }
}
