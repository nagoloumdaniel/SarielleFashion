# HairStyleByPati

- Avant toute modification d'UI, et à chaque message utilisateur : **relire `DESIGN-RULES.md`** et le respecter. Y ajouter toute nouvelle consigne design.
- Roadmap : `ROADMAP.md`. Pas de merge sans accord explicite (P12.6).

## Contexte Sénégal (à respecter partout)

- Monnaie : **FCFA (XOF)**, sans décimales. Les colonnes `*Cents` gardent l'unité interne 1/100 FCFA (affichage = valeur / 100, formatters `currency: 'XOF'`). Saisie admin en FCFA.
- Fuseau par défaut : `Africa/Dakar` (UTC+0, pas d'heure d'été). Ville : Dakar. Téléphone `+221`.
- Cartes prestation : pas de texte « Sur mesure », pas de hover scale.
