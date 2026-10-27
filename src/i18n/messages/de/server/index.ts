import { booking } from './booking';
import { compat } from './compat';
import { contact } from './contact';
import { requests } from './requests';
import { reviews } from './reviews';
import { shared } from './shared';
import { waitlist } from './waitlist';

/** Catalogue fr -> de des messages serveur (une section par domaine, pour éviter les conflits). */
export const deServerMessages: Record<string, string> = {
  ...shared,
  ...booking,
  ...compat,
  ...contact,
  ...requests,
  ...reviews,
  ...waitlist,
};
