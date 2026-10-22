# SarielleFashion

- Avant toute modification d'UI, et à chaque message utilisateur : **relire `DESIGN-RULES.md`** et le respecter. Y ajouter toute nouvelle consigne design.
- Roadmap : `ROADMAP.md`. Pas de merge sans accord explicite.
- Infos encore à fournir par la cliente : `docs/A-FOURNIR.md`.

## Contexte Allemagne (à respecter partout)

- Monnaie : **euro (EUR)**. Les colonnes `*Cents` sont en centimes (affichage = valeur / 100, formatters `currency: 'EUR'`). Saisie admin en euros entiers.
- Fuseau par défaut : `Europe/Berlin` (heure d'été gérée par `Intl`, ne jamais supposer UTC+0). Ville : Clausthal-Zellerfeld. Téléphone `+49`.
- Langue du site : français, **tutoiement** (« tu », « ton »), voix à la première personne (« je »).
- Conformité allemande : Impressum (§ 5 DDG), DSGVO/RGPD, TVA (§ 19 UStG si petite entreprise) : voir `docs/A-FOURNIR.md`.
- Cartes prestation : pas de texte « Sur mesure », pas de hover scale.
