# Politique de sécurité

## Signaler une vulnérabilité

Ne publiez **aucun détail technique** dans une issue publique.

1. Si l'onglet **Security → Report a vulnerability** est disponible sur le dépôt GitHub, utilisez-le (signalement privé).
2. Sinon, ouvrez une issue **non sensible** intitulée « Demande de contact sécurité », sans détail de la faille : le mainteneur répondra pour convenir d'un canal privé.

Merci d'inclure, une fois le canal privé établi, les étapes de reproduction et l'impact estimé.

Réponse visée : accusé de réception sous 72 h, correctif ou plan sous 14 jours (projet maintenu par une seule personne : délais indicatifs).

## Périmètre

Application web (Next.js), API et back-office. Hors périmètre : déni de service,
ingénierie sociale, tests sur la base de production.

Mesures en place : voir [docs/security.md](docs/security.md).
