# Heaven Case — Document de cadrage et base UML

Version 1.0 · 27 octobre 2026 · Périmètre : projet Linear Heaven Case.
Ce document définit le produit cible et prépare sa modélisation ; il ne décrit pas un logiciel entièrement livré.
**Lecture : [E] exigence du backlog ; [H] hypothèse de conception proposée ; D1–D7 décisions à valider.**

## 1. Projet, finalité et résultats attendus

Heaven Case est une plateforme web d’ouverture de caisses virtuelles destinée à la communauté gaming.
Un joueur consulte des caisses thématiques contenant des objets virtuels de raretés différentes, achète avec des crédits et obtient un résultat issu d’un tirage serveur.
Il retrouve ses objets dans son inventaire, suit ses mouvements de crédits, ses statistiques et sa progression.
Le but est de proposer un parcours compréhensible, une attribution fiable des objets et des probabilités transparentes, dans une interface adaptée aux équipements des utilisateurs.
La valeur repose sur la découverte des collections, la lisibilité des règles, la traçabilité des opérations et le suivi des accomplissements.
La réussite du MVP se vérifie par un parcours complet, des données cohérentes, un résultat récupérable après interruption et une utilisation effective en 800 × 600.

## 2. Périmètre et devenir du produit [E]

Le backlog comporte 4 epics, 15 features et 25 user stories actives ; les tickets archivés et de test sont exclus du produit.
Les tranches ci-dessous reprennent la story map : 19 US MVP et 6 US Release 2 ; le seul jalon configuré reste v1.0.0.
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP                   | Catalogue/détails, compte email ou SSO, âge/CGU, récupération d’accès, profil consultable, solde, dépôt par carte, achat, ouverture, preuve d’équité, inventaire et transactions. |
| MVP — besoins imposés | Responsive dont CRT 800 × 600 ; synthèse des statistiques personnelles ; niveau et progression.                                                                                   |
| Release 2             | Revente d’objets, édition du profil, approvisionnement par skins, périodes statistiques, badges et filtrage du catalogue par prix.                                                |
| Socle                 | Panel admin, CI, conteneurisation et initialisation de la base ; leur présence dans le backlog ne suffit pas à démontrer leur validation.                                         |
| Après Release 2 [H]   | Stabiliser l’exploitation, enrichir les collections et les indicateurs, puis évaluer de nouvelles intégrations selon les retours utilisateurs et les décisions produit.           |
Les retraits Steam, échanges entre joueurs, marketplace, classement social et conversion des crédits en argent ne font pas partie du périmètre validé ici.
Le choix entre démonstration, environnement de paiement de test et exploitation avec paiements réels reste à confirmer avant publication (D5).

## 3. Utilisateurs, personas et frontière du système

| Persona                     | Besoin à préserver dans les modèles                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Lucas Martin — personnalisé | Comprendre prix et probabilités, terminer le parcours et retrouver l’objet obtenu.               |
| Thomas Bernard — imposé     | Utiliser toute l’interface sur écran cathodique 800 × 600 ; le défilement vertical est autorisé. |
| Noah Petit — imposé         | Lire ses statistiques et comprendre sa progression, ses niveaux et ses badges.                   |
Les personas représentent des besoins ; ils ne créent pas trois rôles d’autorisation différents.
| Acteur UML               | Interactions et limites                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Visiteur                 | Consulter le catalogue et les probabilités ; commencer une inscription ou une connexion.                       |
| Utilisateur authentifié  | Reprendre son inscription ; accéder aux opérations réservées uniquement lorsque son compte est activé.         |
| Administrateur           | Gérer les caisses, objets, prix et probabilités ; droits précis à confirmer (D7).                              |
| Fournisseur SSO          | Authentifier l’utilisateur et retourner un identifiant externe vérifié ; fournisseurs exacts à confirmer (D2). |
| Prestataire de paiement  | Traiter le paiement et notifier son résultat au serveur ; fournisseur non choisi dans le cadrage.              |
| Service d’envoi d’emails | Acheminer les liens de réinitialisation ; fournisseur non choisi.                                              |
Heaven Case comprend son interface, ses règles serveur, ses données et son administration ; les trois services externes restent hors de cette frontière.

## 4. Cas d’usage et traçabilité fonctionnelle [E]

Les codes UC sont des repères du document, pas de nouveaux tickets Linear.
| Cas  | Capacité                                                            | Acteur principal             | Références                |
| ---- | ------------------------------------------------------------------- | ---------------------------- | ------------------------- |
| UC01 | Consulter caisses, contenu et probabilités ; filtrer par prix en R2 | Visiteur / utilisateur       | HENC-22, HENC-21, HENC-53 |
| UC02 | S’inscrire ou se connecter par email/mot de passe ou SSO            | Visiteur                     | HENC-30                   |
| UC03 | Déclarer sa date de naissance et accepter les CGU                   | Utilisateur en inscription   | HENC-35, HENC-36          |
| UC04 | Réinitialiser un mot de passe local oublié                          | Visiteur titulaire du compte | HENC-32                   |
| UC05 | Consulter son profil ; le modifier en R2                            | Utilisateur activé           | HENC-37, HENC-39          |
| UC06 | Consulter son solde et l’historique des transactions                | Utilisateur activé           | HENC-9, HENC-10           |
| UC07 | Créditer son portefeuille par carte ; par skins en R2               | Utilisateur activé           | HENC-20, HENC-42          |
| UC08 | Acheter une caisse avec ses crédits                                 | Utilisateur activé           | HENC-12                   |
| UC09 | Ouvrir une caisse, lire le résultat et vérifier l’équité            | Utilisateur activé           | HENC-7, HENC-24           |
| UC10 | Consulter ses objets et leur statut                                 | Utilisateur activé           | HENC-15                   |
| UC11 | Revendre un objet contre des crédits en R2                          | Utilisateur activé           | HENC-16                   |
| UC12 | Lire ses statistiques ; changer de période en R2                    | Utilisateur activé           | HENC-49, HENC-50          |
| UC13 | Suivre sa progression ; consulter/débloquer des badges en R2        | Utilisateur activé           | HENC-51, HENC-52          |
| UC14 | Créer/modifier caisses, objets, prix et probabilités                | Administrateur               | HENC-17                   |
Le responsive est transverse : HENC-43 et US HENC-46, HENC-47, HENC-48 ; statistiques et gamification relèvent de HENC-44 et HENC-45.
La CI et l’environnement relèvent de HENC-18 et HENC-41 ; ils alimentent les vues de composants et de déploiement.

## 5. Règles métier et invariants

- R1 [E] Un compte est activé après authentification, contrôle déclaratif des 18 ans minimum et acceptation explicite des CGU ; ces contrôles s’appliquent aussi au SSO.
- R2 [E] Une inscription incomplète peut être reprise ; elle n’autorise pas l’ouverture de caisses ni les autres fonctions réservées.
- R3 [E] L’email de connexion locale est unique ; le couple fournisseur/identifiant externe identifie une connexion SSO. Aucun rattachement automatique ne repose sur le seul email reçu.
- R4 [E] L’acceptation des CGU conserve la version et la date ; la récupération locale utilise un lien à durée limitée et à usage unique, puis invalide les sessions existantes.
- R5 [E] Le serveur vérifie les droits et la propriété des données ; le profil ne renvoie aucun mot de passe, hash ou secret de session.
- R6 [E] Les crédits sont représentés par des entiers ; euros et crédits sont deux unités distinctes. Chaque mouvement de crédits est journalisé avec le solde résultant.
- R7 [E] Un achat exige un solde suffisant ; débit et attribution de caisse sont atomiques. Le solde ne devient pas négatif lors de requêtes concurrentes.
- R8 [E] Un dépôt est crédité après confirmation serveur du prestataire ; une notification répétée ne crédite pas plusieurs fois le même paiement.
- R9 [E] Le tirage est effectué côté serveur selon les pondérations ; les probabilités affichées correspondent au moteur et totalisent 100 % sous réserve d’arrondis.
- R10 [H] Une caisse acquise produit au plus une ouverture réussie ; celle-ci attribue exactement une possession d’objet. Un nouvel essai ne génère pas un second gain.
- R11 [E] La revente exige une confirmation, retire la possession disponible, crédite le portefeuille et trace l’opération ; une même possession ne se revend pas deux fois.
- R12 [E] Les statistiques comptent les ouvertures terminées une seule fois et distinguent résultats observés et probabilités théoriques ; elles sont limitées au compte connecté.
- R13 [E] Une action éligible ne donne sa progression qu’une fois ; un badge est attribué une seule fois par compte. Barèmes, seuils et conditions restent à définir (D4).
- R14 [H] Les informations nécessaires à la relecture d’une opération sont figées : prix payé, valeur attribuée et configuration/preuve du tirage ; moment de fixation à arbitrer (D1/D3).

## 6. Scénarios de référence pour activités et séquences

**S1 — Inscription et accès (UC02/03).** Le visiteur soumet ses identifiants ou suit le SSO ; le serveur valide l’identité et crée/retrouve le compte.
L’utilisateur termine âge et CGU ; l’accès complet n’est autorisé qu’après activation, sinon le parcours reprend les étapes manquantes.
Variantes : email déjà utilisé, identifiants incorrects, SSO annulé/invalide, âge non éligible, refus des CGU ou échec d’enregistrement.

**S2 — Dépôt par carte (UC07).** L’utilisateur choisit un pack ; Heaven Case crée un paiement en attente et démarre le parcours du prestataire.
Une notification serveur vérifiée confirme le paiement ; le serveur enregistre une seule fois le mouvement de crédits et actualise le solde.
Variantes : paiement échoué, retour navigateur avant notification, notification répétée ou invalide ; le retour navigateur seul ne valide pas le crédit.

**S3 — Achat de caisse (UC08), hypothèse H1.** Le serveur vérifie compte, caisse disponible et solde, puis débite et crée une caisse acquise dans la même transaction.
Le joueur peut ouvrir cette caisse ultérieurement ; le prix payé reste rattaché à l’achat.
Variantes : solde insuffisant, caisse indisponible, double envoi ou échec transactionnel ; une opération non validée ne laisse pas de débit isolé.

**S4 — Ouverture (UC09/10), hypothèse H1.** Le serveur vérifie le propriétaire et la disponibilité de la caisse acquise, puis réalise le tirage.
Il enregistre le résultat et sa preuve, attribue la possession d’objet et consomme la caisse de façon cohérente ; l’interface anime le résultat enregistré, sans nouveau débit.
Variantes : requête répétée ou coupure réseau après succès → restituer le résultat existant ; échec avant validation → aucun gain supplémentaire ni caisse perdue.

**S5 — Revente R2 (UC11).** Après confirmation, le serveur vérifie la possession disponible, la marque vendue et crédite le portefeuille avec une transaction liée.
Un double envoi restitue le résultat déjà validé ; l’historique et l’inventaire restent cohérents.

**S6 — Statistiques et progression (UC12/13).** Les statistiques sont calculées à partir des ouvertures validées ; une action métier éligible alimente la progression selon les règles retenues.
Un identifiant d’action empêche le double comptage ; rafraîchir un écran ne donne aucun point supplémentaire. Les badges utilisent leurs conditions en R2.
Variantes : compte sans données, période vide, action déjà traitée ou règles non configurées ; aucun indicateur ne doit inventer de résultat.

**S7 — Récupération d’accès (UC04).** Une réponse générique accompagne la demande ; un compte local reçoit un lien limité dans le temps.
Un lien valide permet le changement puis sa consommation et la révocation des sessions ; lien expiré/utilisé ou compte exclusivement SSO → aucun changement local.

**S8 — Administration (UC14), cible à préciser.** L’administrateur autorisé modifie les données du catalogue ; les valeurs sont validées avant publication.
Une modification ne réécrit pas les résultats passés ; son effet sur les caisses déjà achetées dépend de D1/D3.

## 7. Modèle métier conceptuel proposé [H]

Ce vocabulaire prépare le diagramme de classes ; il ne constitue pas une copie des tables SQL ni une décision de stockage.
**H1, à confirmer par D1 :** suivre HENC-12, avec achat préalable puis ouverture ultérieure ; ajouter AchatCaisse/CaisseAcquise au modèle et adapter le schéma existant.
| Concept                            | Responsabilité et données essentielles                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Compte                             | Identifiant, pseudo, contact éventuel, statut, rôle et résultat d’éligibilité ; propriétaire des ressources personnelles.   |
| IdentiteAuthentification           | Mode local/SSO, email local ou fournisseur/sujet externe, hash local éventuel ; aucun mot de passe en clair.                |
| Session / DemandeReinitialisation  | Autorisation temporaire, expiration/révocation ; jeton de récupération à usage unique pour une identité locale.             |
| VersionCGU / AcceptationCGU        | Texte/version publié, compte acceptant et date ; preuve de l’accord à une version donnée.                                   |
| Portefeuille / MouvementCredits    | Solde en crédits ; écriture signée, type, date, référence d’opération et solde après mouvement.                             |
| Paiement                           | Identifiant prestataire unique, montant/devise, pack de crédits, statut ; confirmation distincte du retour navigateur.      |
| TypeCaisse                         | Caisse du catalogue : nom, visuel, prix en crédits et disponibilité ; distincte d’une caisse achetée.                       |
| ObjetCatalogue                     | Définition d’un skin/objet : nom, visuel, rareté et valeur de référence ; distincte d’un exemplaire possédé.                |
| CompositionCaisse                  | Association d’un TypeCaisse à un ObjetCatalogue avec son poids de tirage ; source des probabilités.                         |
| AchatCaisse / CaisseAcquise        | Achat débité et exemplaire individuel appartenant au compte ; prix payé, type de caisse et statut de consommation.          |
| Ouverture / PreuveTirage           | Tentative, résultat, date et données de vérification ; le schéma évoque notamment hash, seeds et nonce, méthode à préciser. |
| PossessionObjet                    | Exemplaire d’inventaire : propriétaire, objet de catalogue, ouverture source, date et statut.                               |
| Revente                            | Opération R2 liant une possession, la valeur en crédits retenue et le mouvement correspondant.                              |
| VueStatistiques / Periode          | Synthèse dérivée des ouvertures validées, compte et bornes temporelles ; pas une nouvelle source de vérité financière.      |
| Progression / EvenementProgression | Niveau/points du compte et trace unique de l’action éligible ; règles de calcul à définir.                                  |
| Badge / AttributionBadge           | Définition et condition d’un badge ; compte bénéficiaire et date d’attribution.                                             |

## 8. Associations et cardinalités de travail [H]

Ces cardinalités distinguent catalogue, exemplaires et opérations ; elles restent soumises aux décisions D1/D2.
- Un Compte possède 1 Portefeuille ; un Portefeuille comporte 0..* MouvementsCredits, chacun rattaché à un seul portefeuille.
- Un Compte utilise 1 IdentiteAuthentification dans le MVP proposé ; la liaison de plusieurs identités reste une décision D2.
- Un Compte possède 0..* Sessions et 0..* DemandesReinitialisation ; chaque demande cible son identité locale.
- Un Compte possède 0..* AcceptationsCGU ; chaque acceptation vise 1 VersionCGU. Le couple compte/version est unique.
- Un TypeCaisse possède 1..* CompositionsCaisse lorsqu’il est disponible ; chacune référence 1 ObjetCatalogue.
- Un ObjetCatalogue apparaît dans 0..* CompositionsCaisse et dans 0..* PossessionsObjet.
- Un Compte réalise 0..* Paiements et 0..* AchatsCaisse ; chaque opération appartient à un seul compte.
- Sous H1, un AchatCaisse crée 1 CaisseAcquise et 1 mouvement de débit ; la caisse acquise référence 1 TypeCaisse et 1 propriétaire.
- Une CaisseAcquise connaît 0..* tentatives Ouverture, dont au plus 1 réussie ; chaque tentative vise cette seule caisse.
- Une Ouverture réussie attribue 1 PossessionObjet et possède 1 PreuveTirage ; une tentative échouée n’attribue aucune possession.
- Un Compte possède 0..* PossessionsObjet ; chaque possession référence 1 ObjetCatalogue et, dans le MVP, 1 ouverture réussie source.
- Une PossessionObjet possède 0..1 Revente réussie ; une revente réussie produit 1 mouvement de crédit.
- Un Paiement confirmé produit 1 mouvement de crédit ; une référence prestataire ne produit jamais plusieurs crédits.
- Un Compte possède 1 Progression initialisée à zéro et 0..* EvenementsProgression, uniques par compte/action éligible.
- Un Compte possède 0..* AttributionsBadge ; chacune référence 1 Badge, avec unicité du couple compte/badge.
- Une VueStatistiques est calculée pour 1 compte et 1 période à partir de 0..* ouvertures réussies.

## 9. Cycles de vie à modéliser [H, cohérents avec les exigences]

- Compte : inscription_incomplete → actif si âge éligible et CGU acceptées ; l’état connecté appartient à la session, pas au compte.
- Session : valide → expirée ou révoquée ; DemandeReinitialisation : valide → utilisée ou expirée.
- Paiement : en_attente → confirmé ou échoué ; traitement des annulations/remboursements à préciser dans D5.
- CaisseAcquise sous H1 : disponible → réservée_pour_ouverture → consommée ; échec avant validation → disponible.
- Ouverture : en_cours → réussie ou échouée ; le résultat d’une ouverture réussie ne change plus.
- PossessionObjet : disponible → vendue en R2 ; les états retirée/améliorée du schéma ne sont pas engagés dans le périmètre actuel.
- Badge pour un compte : non obtenu → obtenu ; l’AttributionBadge est créée une seule fois, avec sa date d’obtention.
Les transitions doivent préciser l’acteur, la garde, les effets persistés et le comportement en cas d’échec ou de répétition.

## 10. Architecture cible pour composants et déploiement [H]

- Point de départ proposé : application serveur modulaire, avec responsabilités métier séparées.
- Modules métier : identités/accès, catalogue/admin, portefeuille/paiements, achats/ouvertures, inventaire/revente, statistiques et progression/badges.
- Interface web responsive → API serveur → modules métier → stockage ; les opérations sensibles sont validées par le serveur.
- Stockage relationnel envisagé d’après le schéma SQL ; le SGBD, les frameworks et l’hébergement restent à choisir (D6).
- Intégrations externes séparées : SSO, paiement avec notifications serveur et envoi d’emails ; secrets conservés côté serveur.
- Flux cibles : HTTPS pour l’interface/API et les retours externes ; accès privé et authentifié au stockage.
- Frontières transactionnelles : achat/débit/attribution ; ouverture/consommation/objet ; revente/crédit ; confirmation de dépôt/crédit.
- Déploiement à préciser : navigateur, application web/API, base et services externes, avec environnements de validation et de production distincts.
- La conteneurisation et la CI relèvent de HENC-41/18 ; les rôles des exécutants, les sauvegardes et la reprise restent à définir.

## 11. Exigences transverses et critères de validation

- UX [E] : parcours principal utilisable en 800 × 600 à 100 % de zoom, sans défilement horizontal nécessaire ; formulaires, dialogues et résultat accessibles.
- Intégrité [E/H] : opérations répétées ou concurrentes sans double débit, double crédit, double gain ni progression attribuée deux fois.
- Accès [E] : contrôle serveur du compte actif, des droits et du propriétaire ; réponses d’authentification/récupération sans divulgation du compte existant.
- Traçabilité [E/H] : relier paiement, achat, ouverture et revente à leurs mouvements et résultats ; conserver les instantanés utiles à la relecture.
- Sécurité du compte [E] : expiration/révocation, protection des mots de passe et limitation des tentatives ; déconnexion à détailler dans D7.
- Tests [H] : scénarios nominaux, solde insuffisant, retours externes invalides, doubles appels, notifications répétées, interruption réseau et compte sans données.
- Exploitation [H] : vérifier restauration et gestion des secrets avant publication ; objectifs chiffrés de performance/disponibilité à fixer, sans les inventer ici.

## 12. Décisions à valider avant de figer l’UML

| Repère | Décision et impact sur les diagrammes                                                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1     | Confirmer H1 : achat préalable avec caisse possédée, ou débit à l’ouverture. HENC-12 et le schéma actuel divergent ; choisir un seul flux de débit et le moment de fixation du contenu/prix. |
| D2     | Confirmer fournisseurs SSO, cardinalité des identités et éventuelle liaison de comptes ; HENC-2 cite Discord, HENC-30 évoque Discord/Steam.                                                  |
| D3     | Définir l’algorithme de tirage, les données de preuve et leur vérification, les versions des probabilités et les effets des changements admin.                                               |
| D4     | Fixer agrégation/périodes statistiques, actions éligibles, barème, niveaux, badges et conditions ; HENC-50 dépend de HENC-49, HENC-52 de HENC-51.                                            |
| D5     | Choisir prestataire, mode test/réel, conversion packs euros/crédits, annulations/remboursements et règles du dépôt par skins avant sa réalisation.                                           |
| D6     | Choisir stack, SGBD, hébergement et mode de déploiement ; fixer sauvegarde/reprise, conservation des données et objectifs de qualité.                                                        |
| D7     | Définir droits admin, portée de la création dans HENC-22 face à HENC-17, déconnexion/sessions et stories manquantes du socle.                                                                |
Les hypothèses H1, de cardinalité et d’architecture doivent rester signalées dans les diagrammes tant que ces décisions ne sont pas validées.

## 13. Dossier UML à produire depuis ce cadrage

| Diagramme               | Contenu minimal et source                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cas d’utilisation       | Frontière Heaven Case, acteurs et UC01–UC14 ; accès public, inscription incomplète, compte activé et administration.                                  |
| Activités               | S1 à S8, gardes d’éligibilité/solde/propriété, branches d’erreur et alternatives MVP/R2.                                                              |
| Séquences               | Identité locale/SSO, activation, paiement/notification, achat, ouverture, revente, récupération et progression ; variantes répétition/interruption.   |
| Classes                 | Concepts et associations des sections 7/8, contraintes R1–R14, séparation catalogue/exemplaires et euros/crédits.                                     |
| États-transitions       | Cycles de la section 9, gardes et effets transactionnels ; distinguer état de compte et état de session.                                              |
| Paquetages / composants | Modules et dépendances de la section 10 ; isoler intégrations externes, UI et persistance.                                                            |
| Déploiement             | Environnements, nœuds applicatifs, base, fournisseurs externes et flux ; technologies renseignées après D6.                                           |
| Objets, si utile        | Exemple concret : un compte, son achat, une caisse acquise, une ouverture, une possession et les mouvements associés, pour vérifier les cardinalités. |
Chaque élément UML doit renvoyer à un UC, une règle, un ticket ou une hypothèse ; toute alternative non arbitrée porte son repère D.
Le dossier est cohérent si tous les UC ont leurs scénarios, si les séquences utilisent les classes définies et si leurs effets respectent les états et invariants.

## 14. Sources de référence

- [Projet et tickets Heaven Case](https://linear.app/lemedpo/project/heaven-case-0f468adeae13) : périmètre fonctionnel et critères d’acceptation.
- [Story map](https://linear.app/lemedpo/document/heaven-case-user-story-map-storyboard-db2884f60415) : tranches proposées et arbitrages ; [Personas](https://linear.app/lemedpo/document/personas-a47efa7488ea) : besoins utilisateurs.
- [Schéma de données](https://linear.app/lemedpo/document/heaven-case-schema-de-base-de-donnees-c7ec637365c8) : point de départ technique à réconcilier avec H1.
- [Workflow](https://linear.app/lemedpo/document/heaven-case-workflow-de-developpement-d67d2f677caa) : organisation de réalisation ; l’architecture détaillée y reste à compléter.
