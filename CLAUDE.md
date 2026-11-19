# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

HeavenCases : site d'ouverture de caisses **CS2**, sur le modèle de Hellcase. Les objets sont des skins CS2 (« AK-47 | Redline », « ★ Karambit | Fade »), avec usure (FN à BS), StatTrak™ et grades CS (Mil-Spec, Restricted, Classified, Covert, ★). Monnaie virtuelle uniquement (1 crédit = 0,01 €), site réservé aux majeurs. La marque et l'interface suivent les maquettes de `docs/mockups/` (noir et or). Code, commentaires, messages et interface sont en **français** ; les routes du front sont en anglais (`/login`, `/register`, `/cases/:slug`).

## Rédaction de l'interface

Pas de texte de remplissage généré par IA, ni dans le front ni dans les données :

- pas d'accroches marketing, de sous-titres décoratifs sous les titres, de messages de bienvenue, de blagues (404 « perdue dans les nuages »), d'emojis ou de symboles décoratifs ;
- pas de descriptions de caisses inventées (`cases.description` reste NULL pour les caisses de démo) ;
- uniquement des libellés courts et fonctionnels, comme sur Hellcase : nom, prix, bouton d'action, chances, usure, messages d'erreur factuels.

Avant d'ajouter un texte visible, se demander s'il informe ou s'il décore. S'il décore, ne pas l'écrire. Les textes repris de la maquette peuvent rester.

## Commandes

### Back (`back/`) : Rust 2024, Axum 0.8, SQLx 0.8 (Postgres 17)

```bash
cargo run                                    # DATABASE_URL, APP_URL, SMTP_HOST, SMTP_PORT, MAIL_FROM requis
cargo fmt --check                            # CI
cargo clippy --all-targets -- -D warnings    # CI : tout warning échoue
cargo test                                   # tests #[sqlx::test], Postgres requis (DATABASE_URL)
cargo test <nom>                             # un seul test
```

`APP_URL` doit pointer vers le **front** : les mails ouvrent `{APP_URL}/auth/verify` et `{APP_URL}/reset-password`. `back/api.http` contient des requêtes d'exemple, Swagger est sur `/swagger-ui` ; `OPENAPI_OUT=openapi.json cargo test openapi_spec` exporte la spec sans base. Toute nouvelle route va dans `paths(...)` de `routes/mod.rs`, avec `security(("session" = []))` si elle utilise `AuthUser`, et `body = ErrorBody` sur ses erreurs JSON.

### Front (`front/`) : Vite 6, React 19, TypeScript, Tailwind v4, shadcn/ui

```bash
npm run dev      # /api relayé vers http://localhost:3000 (API_PROXY_TARGET pour un autre port)
npm run lint     # CI
npm run build    # CI : tsc -b puis vite build
npm run storybook        # http://localhost:6006
npm run build-storybook  # CI
```

npm est le gestionnaire de paquets (`package-lock.json`).

## Architecture

### Back

- `main.rs` applique les migrations au démarrage (`sqlx::migrate!`) et pose la session (`tower-sessions`, store Postgres).
- `routes/` : un sous-routeur par ressource, documenté avec utoipa. `auth.rs` (inscription, validation email, connexion, `/auth/me`, logout, mot de passe oublié) renvoie ses erreurs en texte brut ; les autres routes utilisent `errors::AppError` (`{ "error": "…" }`).
- `auth_user::AuthUser` : extracteur du joueur connecté (lit `user_id` dans la session), 401 sinon.
- Moteur d'ouverture :
  - `catalog.rs` : caisses et table de butin, dans un ordre canonique (poids croissant puis id) partagé par l'affichage et le tirage.
  - `fair.rs` : HMAC-SHA256(server_seed, `client_seed:nonce`), puis ticket 0-99 999.
  - `seeds.rs` : server seed active, rotation et révélation.
  - `opening.rs` : achat et ouverture dans une seule transaction qui verrouille la ligne du joueur.
- `drop_weight` est en millièmes de pourcent : une caisse n'est ouvrable que si ses poids totalisent 100 000.
- Catalogue de démo : migration générée par `back/scripts/gen_catalogue.py` (jeu de données ByMykel/CSGO-API pour noms, grades et images ; prix estimés ; ~88 % de valeur rendue par caisse). Ne jamais modifier une migration déjà mergée : en générer une nouvelle.

### Front

- `lib/api.ts` : client `fetch` (cookie de session) et `toastError`. Toutes les erreurs d'API ou de réseau passent par le toaster Sonner ; seules les erreurs de validation de champ restent sous le champ.
- `auth/` : `AuthProvider` (session lue via `/auth/me`) et `useAuth`.
- `lib/cases.ts` : types de l'API caisses, grades CS2 (`rarityMeta`), usure.
- `components/ui/` : composants shadcn générés (ne pas les réécrire à la main, préférer `npx shadcn add`). Le thème shadcn est remappé sur la palette noir et or dans `src/index.css`, avec les couleurs de grades CS2.

## Workflow

- Avant de créer une branche, lire les US Linear (projet Heaven Case, équipe HENC). Une branche `feat/HENC-<feature>/<nom>` regroupe des branches `us/HENC-<us>/<nom>`, puis PR vers `dev`. Seul `dev` peut être mergé dans `master`.
- Commits conventionnels en français (`feat: …`, `fix: …`), terminés par `Refs HENC-x`. Titre de PR : `[Dev] [HENC-x] Nom de la feature`.
- Chaque composant partagé a ses stories (`*.stories.tsx` à côté du composant, données dans `src/stories/fixtures.ts`).
- La CI ne lance les jobs front ou back que si `front/**` ou `back/**` change. `docs.yml` publie Storybook et Swagger sur GitHub Pages à chaque push sur `dev` / `master`. `npm audit` et `cargo audit` sont informatifs.
