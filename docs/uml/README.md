# Heaven Case — Dossier UML

32 diagrammes de conception, leurs sources PlantUML et leurs exports PNG / SVG.
Base : `../heaven-case-cadrage.md` (copie figée dans `reference/cadrage-source.md`).
Le dossier modélise la **cible** du projet ; les couleurs/notes distinguent explicitement le socle observé.

## Ouvrir et exporter

- Ouvrir `index.html` pour parcourir la galerie hors ligne et accéder aux PNG / SVG.
- `png/` : images exportables ; `svg/` : images vectorielles agrandissables ; `src/` : sources éditables.
- `apercu-uml.png` : vue d’ensemble ; `manifest.json` : inventaire et traçabilité ; `verification.json` : contrôles de génération.
- [Projet Linear et Ressources](https://linear.app/lemedpo/project/heaven-case-0f468adeae13)
- [Document de cadrage Linear](https://linear.app/lemedpo/document/heaven-case-cadrage-du-projet-et-base-uml-fe7df30e3e1e)

## Hypothèses conservées

- **H1 / D1** : achat préalable, caisse acquise puis ouverture ultérieure. Le débit a lieu à l’achat, pas une seconde fois à l’ouverture.
- **D2** : fournisseurs SSO et cardinalité des identités à confirmer ; le modèle propose une identité par compte au MVP.
- **D3** : algorithme, versions de probabilités, preuve et politique de révélation à définir. Les instantanés passés ne sont pas réécrits.
- **D4** : barème, actions éligibles, seuils et badges ne sont pas inventés. L’événement de progression est logique, sans imposer un broker.
- **D5** : prestataire, conversion euros/crédits et mode test/réel restent ouverts ; les exemples d’objets n’imposent pas de conversion.
- **D6** : le dépôt précise désormais React/TypeScript/Vite, Rust/Axum/SQLx et PostgreSQL 17 ; hébergement, TLS et exploitation restent une cible.
- **D7** : droits d’administration et détails des sessions / déconnexion restent à finaliser.

## Ce que montre réellement le dépôt

- Référence de lecture : commit `c5d145b` ; état local lu le 27 octobre 2026.
- `front/package.json`, `front/src/pages/HomePage.tsx` : socle React/Vite ; page d’accueil, pas parcours métier complet.
- `back/src/main.rs` et `back/src/routes/` : socle Axum, connexion SQLx, migrations et routes santé / utilisateurs.
- Les handlers `/users` comportent encore des réponses de démonstration ; les modules fonctionnels sont donc représentés comme cibles.
- `back/migrations/20261027102511_init_schema.sql` : schéma initial ; il ne contient pas encore tous les concepts cibles de consentement, caisse acquise et progression.
- `back/docker-compose.yml` : API + PostgreSQL ; `front/Dockerfile` : build React et Nginx. Le déploiement web/TLS commun est une proposition.
- Écart à résoudre dans D6 : l’API utilise `PORT=3000` dans compose, mais le Dockerfile annonce `EXPOSE 8080`. Les fichiers applicatifs ne sont pas modifiés par ce dossier.

## Régénérer localement

Outils utilisés : PlantUML 1.2026.9, Java Temurin 21.0.13, moteur Smetana embarqué ; aucune transmission des sources à un serveur de rendu.
Fournir Java et le JAR PlantUML (aucun binaire de ces outils n’est ajouté au dépôt) :

```sh
python3 render.py --java /chemin/vers/java --plantuml /chemin/vers/plantuml.jar
python3 render.py --java /chemin/vers/java --plantuml /chemin/vers/plantuml.jar --check-only
```

Le script vérifie la syntaxe, puis génère les deux formats. Chaque source inclut uniquement `src/_theme.puml` local.
Références des outils : [CLI PlantUML](https://plantuml.com/command-line), [moteur Smetana](https://plantuml.com/graphviz-dot).

## Inventaire

| Diagramme | Famille | Sources / images | Traçabilité |
| --- | --- | --- | --- |
| Cas d’utilisation — frontiere et acteurs | Cas d’utilisation | [PlantUML](src/01-cas-utilisation.puml) · [PNG](png/01-cas-utilisation.png) · [SVG](svg/01-cas-utilisation.svg) | UC01–UC14 · HENC-7 a HENC-53 ; D2, D5, D7 |
| Classes — compte, identite et consentement | Classes et objets | [PlantUML](src/02-classes-compte.puml) · [PNG](png/02-classes-compte.png) · [SVG](svg/02-classes-compte.svg) | UC02–UC05 · R1–R5 ; D2, D7 |
| Classes — portefeuille, achat, ouverture et inventaire | Classes et objets | [PlantUML](src/03-classes-economie.puml) · [PNG](png/03-classes-economie.png) · [SVG](svg/03-classes-economie.svg) | UC06–UC11 · R6–R11, R14 ; D1, D3, D5 |
| Classes — statistiques, progression et badges | Classes et objets | [PlantUML](src/04-classes-progression.puml) · [PNG](png/04-classes-progression.png) · [SVG](svg/04-classes-progression.svg) | UC12–UC13 · HENC-49 a HENC-52 · R12–R13 ; D4 |
| S1 — Inscription et activation | Activités | [PlantUML](src/05-activite-inscription.puml) · [PNG](png/05-activite-inscription.png) · [SVG](svg/05-activite-inscription.svg) | UC02/03 · HENC-30, 35, 36 ; D2 |
| S2 — Depot par carte et confirmation serveur | Activités | [PlantUML](src/06-activite-depot.puml) · [PNG](png/06-activite-depot.png) · [SVG](svg/06-activite-depot.svg) | UC07 · HENC-20 · R6/R8 ; D5 |
| S3 — Achat d’une caisse [H1] | Activités | [PlantUML](src/07-activite-achat.puml) · [PNG](png/07-activite-achat.png) · [SVG](svg/07-activite-achat.svg) | UC08 · HENC-12 · R6/R7 ; D1 |
| S4 — Ouverture et attribution [H1] | Activités | [PlantUML](src/08-activite-ouverture.puml) · [PNG](png/08-activite-ouverture.png) · [SVG](svg/08-activite-ouverture.svg) | UC09/10 · HENC-7, 24, 48 · R9/R10 ; D1, D3 |
| S5 — Revente d’un objet | Activités | [PlantUML](src/09-activite-revente.puml) · [PNG](png/09-activite-revente.png) · [SVG](svg/09-activite-revente.svg) | UC11 · HENC-16 · R11 ; D5 |
| S6 — Statistiques et progression | Activités | [PlantUML](src/10-activite-statistiques.puml) · [PNG](png/10-activite-statistiques.png) · [SVG](svg/10-activite-statistiques.svg) | UC12/13 · HENC-49 a 52 · R12/R13 ; D4 |
| S7 — Recuperation du mot de passe | Activités | [PlantUML](src/11-activite-recuperation.puml) · [PNG](png/11-activite-recuperation.png) · [SVG](svg/11-activite-recuperation.svg) | UC04 · HENC-32 · R4/R5 ; D2, D7 |
| S8 — Administration du catalogue | Activités | [PlantUML](src/12-activite-administration.puml) · [PNG](png/12-activite-administration.png) · [SVG](svg/12-activite-administration.svg) | UC14 · HENC-17 · R9/R14 ; D1, D3, D7 |
| S1 — Identite, age et CGU | Séquences | [PlantUML](src/13-sequence-inscription.puml) · [PNG](png/13-sequence-inscription.png) · [SVG](svg/13-sequence-inscription.svg) | UC02/03 · R1–R5 ; D2 |
| S2 — Depot et notification idempotente | Séquences | [PlantUML](src/14-sequence-depot.puml) · [PNG](png/14-sequence-depot.png) · [SVG](svg/14-sequence-depot.svg) | UC07 · HENC-20 · R6/R8 ; D5 |
| S3 — Achat atomique [H1] | Séquences | [PlantUML](src/15-sequence-achat.puml) · [PNG](png/15-sequence-achat.png) · [SVG](svg/15-sequence-achat.svg) | UC08 · HENC-12 · R6/R7 ; D1 |
| S4 — Resultat autoritaire et attribution [H1] | Séquences | [PlantUML](src/16-sequence-ouverture.puml) · [PNG](png/16-sequence-ouverture.png) · [SVG](svg/16-sequence-ouverture.svg) | UC09/10 · HENC-7, 24 · R9/R10 ; D1, D3 |
| S5 — Revente et protection contre le double credit | Séquences | [PlantUML](src/17-sequence-revente.puml) · [PNG](png/17-sequence-revente.png) · [SVG](svg/17-sequence-revente.svg) | UC11 · HENC-16 · R11 ; D5 |
| S6 — Lectures statistiques et evenement de progression | Séquences | [PlantUML](src/18-sequence-statistiques.puml) · [PNG](png/18-sequence-statistiques.png) · [SVG](svg/18-sequence-statistiques.svg) | UC12/13 · HENC-49 a 52 · R12/R13 ; D4 |
| S7 — Jeton unique et revocation des sessions | Séquences | [PlantUML](src/19-sequence-recuperation.puml) · [PNG](png/19-sequence-recuperation.png) · [SVG](svg/19-sequence-recuperation.svg) | UC04 · HENC-32 · R4/R5 ; D2, D7 |
| S8 — Publication d’une configuration de caisse | Séquences | [PlantUML](src/20-sequence-administration.puml) · [PNG](png/20-sequence-administration.png) · [SVG](svg/20-sequence-administration.svg) | UC14 · HENC-17 · R9/R14 ; D1, D3, D7 |
| Compte — activation et inscription incomplete | États-transitions | [PlantUML](src/21-etat-compte.puml) · [PNG](png/21-etat-compte.png) · [SVG](svg/21-etat-compte.svg) | UC02/03 · R1/R2 ; D2, D7 |
| Session — validite, expiration et revocation | États-transitions | [PlantUML](src/22-etat-session.puml) · [PNG](png/22-etat-session.png) · [SVG](svg/22-etat-session.svg) | UC02/04 · R4/R5 ; D7 |
| Demande de reinitialisation — usage unique | États-transitions | [PlantUML](src/23-etat-recuperation.puml) · [PNG](png/23-etat-recuperation.png) · [SVG](svg/23-etat-recuperation.svg) | UC04 · HENC-32 · R4 ; D7 |
| Paiement — confirmation serveur unique | États-transitions | [PlantUML](src/24-etat-paiement.puml) · [PNG](png/24-etat-paiement.png) · [SVG](svg/24-etat-paiement.svg) | UC07 · HENC-20 · R8 ; D5 |
| CaisseAcquise — consommation unique [H1] | États-transitions | [PlantUML](src/25-etat-caisse-acquise.puml) · [PNG](png/25-etat-caisse-acquise.png) · [SVG](svg/25-etat-caisse-acquise.svg) | UC08/09 · R7/R10 ; D1, D3 |
| Ouverture — tentative et resultat immuable | États-transitions | [PlantUML](src/26-etat-ouverture.puml) · [PNG](png/26-etat-ouverture.png) · [SVG](svg/26-etat-ouverture.svg) | UC09/10 · R9/R10/R14 ; D1, D3 |
| PossessionObjet — disponibilite et revente | États-transitions | [PlantUML](src/27-etat-possession.puml) · [PNG](png/27-etat-possession.png) · [SVG](svg/27-etat-possession.svg) | UC10/11 · HENC-15/16 · R11 ; D5 |
| Badge pour un compte — attribution unique | États-transitions | [PlantUML](src/28-etat-badge.puml) · [PNG](png/28-etat-badge.png) · [SVG](svg/28-etat-badge.svg) | UC13 · HENC-52 · R13 ; D4 |
| Paquetages — responsabilites et dependances | Architecture | [PlantUML](src/29-paquetages.puml) · [PNG](png/29-paquetages.png) · [SVG](svg/29-paquetages.svg) | Cadrage §10 · UC01–UC14 ; D4, D6, D7 |
| Composants — socle observe et cible fonctionnelle | Architecture | [PlantUML](src/30-composants.puml) · [PNG](png/30-composants.png) · [SVG](svg/30-composants.svg) | Depot c5d145b · cadrage §10 ; D2, D5, D6, D7 |
| Deploiement — cible validation / production | Architecture | [PlantUML](src/31-deploiement.puml) · [PNG](png/31-deploiement.png) · [SVG](svg/31-deploiement.svg) | Dockerfiles, compose et cadrage §10 ; D2, D5, D6 |
| Objets — exemple apres achat puis ouverture [H1] | Classes et objets | [PlantUML](src/32-objets-exemple.puml) · [PNG](png/32-objets-exemple.png) · [SVG](svg/32-objets-exemple.svg) | UC08/09/10 · R6–R10 · exemple fictif ; D1, D3, D5 |

## Règles de lecture

- Les diagrammes de classes sont conceptuels : ils ne prétendent pas être les structures Rust ni les tables existantes.
- Les états de compte et de session sont distincts ; une inscription incomplète conserve un accès limité à sa finalisation.
- Les huit activités et huit séquences couvrent S1–S8, avec répétitions, échecs et frontières transactionnelles.
- Les états sont séparés par objet ; le badge est montré du point de vue d’un compte, l’attribution n’existant qu’après obtention.
- Les cardinalités conditionnelles sont explicitées dans les notes : paiement en attente sans mouvement ; paiement confirmé avec un seul crédit.
- Les types de mouvement cibles (par exemple achat de caisse séparé) demandent une migration si H1 est validée.
- Aucun retrait Steam, échange entre joueurs, marketplace ou autre capacité hors cadrage n’est engagé ici.
