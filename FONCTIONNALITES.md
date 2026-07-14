# HoopCI — Toutes les fonctionnalités de l'application

> **HoopCI** est le réseau professionnel du street basket ivoirien, centré sur Abidjan :
> annuaire de tournois, profils joueurs à statistiques vérifiées, marché de talents,
> événements basket et mise en relation joueurs ↔ recruteurs.
>
> Stack : **Django + DRF (API REST, JWT)** · **React + Vite (PWA mobile-first)** ·
> PostgreSQL (SQLite en dev) · Celery + Redis · Paiement **GeniusPay**.
>
> Document mis à jour le 9 juillet 2026.

---

## 1. Comptes, rôles et sécurité

### 1.1 Les 3 rôles
| Rôle | Ce qu'il peut faire |
|---|---|
| **Promoteur** | Crée et gère tournois et événements (gratuit), saisit les résultats, peut **promouvoir** un tournoi (5 000 FCFA) |
| **Joueur** | Profil public avec stats vérifiées et grade, s'inscrit aux tournois, reçoit des offres |
| **Client / Recruteur** | Consulte, suit ses favoris, envoie des offres aux joueurs, reçoit des suggestions |
| **Staff / Admin** | Accède au **dashboard d'administration externe** (voir § 9) et au back-office Django |

### 1.2 Inscription
- Choix du rôle en **cartes visuelles** (2×2 sur mobile, 4 colonnes sur desktop).
- Champs : prénom, nom, e-mail (identifiant unique), téléphone, commune (liste des 13 communes d'Abidjan), mot de passe (8 caractères minimum, validateurs Django).
- Case CGU obligatoire avec mention de la **loi ivoirienne n° 2013-450 / ARTCI** sur les données personnelles.
- Connexion automatique après l'inscription + redirection selon le rôle (promoteur → créer un tournoi, joueur → son profil).
- Le `username` est généré automatiquement depuis l'e-mail si absent.

### 1.3 Protection des mineurs (dès la conception)
- Le joueur renseigne sa **date de naissance** ; s'il a moins de 18 ans :
  - alerte affichée + case « mon parent/tuteur est informé » obligatoire ;
  - le compte est marqué `is_minor` avec champ `consentement_parental` ;
  - **le profil public est masqué** pour les visiteurs non connectés : nom remplacé par « Joueur mineur », photo cachée (seule la commune reste visible) ;
  - bandeau d'avertissement sur sa fiche : toute mise en relation passe par le tuteur.
- Un mineur **ne peut pas** être promoteur (bloqué côté serveur).

### 1.4 Authentification (JWT)
- Connexion par e-mail + mot de passe → couple de tokens **JWT** (access 2 h, refresh 30 jours).
- Le **rôle est embarqué dans le token** (évite un appel réseau au démarrage).
- **Rotation des refresh tokens** + blacklist à la déconnexion (le token volé devient inutilisable).
- Côté front : session persistée dans le navigateur (`localStorage`), **rafraîchissement automatique** du token sur toute réponse 401, déconnexion propre si le refresh échoue.
- Routes protégées par rôle côté front (`ProtectedRoute`) **et** permissions par rôle côté API (la vraie sécurité est serveur).

### 1.5 Mon compte (page Profil)
- Édition : prénom, nom, commune, téléphone, **photo de profil** (upload).
- Déconnexion (avec toast « À bientôt sur HoopCI ! »).
- Le joueur y gère en plus son profil sportif et sa carte de transfert (voir § 5 et § 6).

---

## 2. Tournois

### 2.1 Annuaire public (page d'accueil)
- Hero avec slogan, photo, CTA « Voir les tournois » / « Rejoindre » (si non connecté).
- Liste paginée (20 par page, boutons Précédent/Suivant) de cartes tournoi.
- **Filtres combinables** : recherche texte (titre, commune, lieu), commune, format (3x3 / 5x5), niveau (Débutant / Intermédiaire / Élite), statut + bouton « Effacer ».
- L'API accepte aussi : bornes de dates (`date_debut_min/max`), budget max (`frais_max`), `gratuit=true`.
- **Les tournois promus apparaissent en premier** avec badge « ★ Promu » et liseré orange.
- Carte tournoi : affiche (ou dégradé de secours généré à partir de l'id), titre, badge statut coloré, format, niveau, commune, dates, nombre d'équipes, **frais en FCFA** (« Gratuit » si 0), nom du promoteur.
- Chip « 🏆 Palmarès » vers le récap des tournois terminés.
- Section sponsors (emplacements « Votre marque ici »).

### 2.2 Statuts d'un tournoi
`Ouvert` → `Complet` / `En cours` → `Terminé` / `Annulé`.

### 2.3 Fiche tournoi (détail)
- Grande couverture (affiche ou dégradé), bouton retour, **bouton favori ❤** (toggle, connecté).
- Tuiles d'infos : dates, format + niveau, frais d'inscription, équipes inscrites / max avec **barre de progression**.
- Description libre, **lieu avec lien Google Maps**, téléphone de contact du promoteur.
- Liste des **équipes inscrites avec leurs membres**.
- Actions joueur : **« Inscrire mon équipe »** (nom d'équipe unique par tournoi ; le joueur qui inscrit devient automatiquement membre) ou **« Rejoindre une équipe »** existante (impossible en double).
- Contrôles : inscriptions fermées si le tournoi n'est pas « Ouvert » ; refus si le nombre max d'équipes est atteint.
- **Résultat final** (si terminé) : équipe gagnante (rang 1, médaille) avec **score de la finale**, équipe finaliste (rang 2) avec son score, **bandeau MVP** avec lien vers son profil.

### 2.4 Création de tournoi
- Ouverte aux **promoteurs — gratuite et immédiate**.
- Champs : titre, description, commune, lieu, dates début/fin (validées : fin ≥ début, côté front **et** API), format, niveau, équipes max, frais d'inscription (FCFA), téléphone de contact, **affiche** (JPG/PNG).
- Encart informatif : possibilité de **promouvoir** le tournoi après publication (5 000 FCFA, voir § 3).

### 2.5 Dashboard « Mes tournois » (promoteur)
- Compteurs : nombre de tournois, total d'équipes inscrites.
- Pour chaque tournoi : badge statut, badge « Promu » le cas échéant, infos clés, **changement de statut** (validé côté serveur), lien fiche.
- **Bouton « ★ Promouvoir ce tournoi (5 000 FCFA) »** sur chaque tournoi actif non promu.
- **Saisie des résultats** (tournoi en cours ou terminé) dans une fenêtre dédiée :
  - équipe gagnante (obligatoire) ;
  - **équipe finaliste** (battue en finale, optionnelle — ne peut pas être la gagnante) ;
  - **scores de la finale** (ex. 21 – 17) ;
  - **MVP** choisi parmi les joueurs réellement inscrits au tournoi (contrôlé par l'API) ;
  - avertissement si un résultat existe déjà (le valider le remplace) ;
  - à la validation : le tournoi passe « Terminé » et **les statistiques de tous les participants sont recalculées automatiquement**.

### 2.6 Favoris
- Cœur sur chaque fiche tournoi (connecté), page **Favoris** listant les tournois suivis.

### 2.7 Palmarès (récap des tournois terminés) 🆕
- Page publique **/palmares**, onglet « Palmarès » dans la navigation. Deux onglets :
- **Résultats** : pour chaque tournoi terminé — titre, format, commune, dates, niveau,
  **vainqueur 🏆 avec score**, **finaliste avec score**, **MVP**, promoteur. Filtre par commune.
- **Classement des équipes** 🆕 (accès direct `/palmares#equipes`) : les équipes regroupées
  par nom, tous tournois confondus, classées selon leurs performances —
  **victoire ×30 · finale perdue ×15 · participation ×5**, avec taux de victoire calculé
  sur les tournois à résultat officiel. Le n° 1 est mis en valeur (trophée).

### 2.8 Recommandations intelligentes pour les joueurs 🆕
- Section **« Recommandés pour toi »** sur l'accueil (joueur connecté).
- Le moteur note chaque tournoi ouvert et à venir (le joueur n'y est pas déjà inscrit) :
  - **niveau adapté au grade** (Bronze→Débutant … Légende→Élite) : +40 pts (niveau adjacent : +15) ;
  - un joueur avec **≥ 60 % de victoires** est poussé vers le niveau supérieur ;
  - **même commune** que le joueur : +25 ;
  - **format habituel** (3x3/5x5 le plus joué dans son historique) : +15 ;
  - tournoi **promu** : +10 ; **gratuit** si le joueur n'a jamais joué : +10.
- Chaque recommandation affiche **ses raisons** en chips : « Niveau adapté à ton grade (Argent) », « Dans ta commune », « Format 3x3, ton format habituel », « Promu par HoopCI »…

---

## 3. Promotion payante GeniusPay (promoteurs) 🆕

### 3.1 Le principe
Tout promoteur propriétaire d'un tournoi peut le **promouvoir**
pour **5 000 FCFA** (configurable via `TARIF_PUBLICATION_TOURNOI`). La publication,
elle, est **gratuite** — la promotion est une option de visibilité :
- badge **« ★ Promu »** + liseré orange sur la carte ;
- **affiché en tête** de l'annuaire ;
- **bonus dans les recommandations** envoyées aux joueurs.

### 3.2 Le parcours
1. Le tournoi est créé et **publié gratuitement** (visible immédiatement).
2. Bouton **« ★ Promouvoir ce tournoi (5 000 FCFA) »** dans « Mes tournois » → page récapitulatif (avantages, montant).
3. Bouton **« Payer 5 000 FCFA avec GeniusPay »** → redirection vers le **checkout hébergé GeniusPay** : paiement avec **Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire**.
4. Retour sur HoopCI : page **« Vérification du paiement… »** qui se met à jour automatiquement (polling toutes les 3 s).
5. Paiement confirmé → le tournoi devient **« Promu »** automatiquement. Écran de succès → « Voir mon tournoi ».
6. Paiement échoué/annulé/expiré → écran d'erreur avec **« Réessayer le paiement »** (aucun doublon : le paiement en attente est réutilisé).
7. Un tournoi déjà promu, terminé ou annulé ne peut pas être payé (contrôlé côté serveur).

### 3.3 Sous le capot (fiabilité et sécurité)
- **Webhook GeniusPay** (`payment.success`, etc.) avec **vérification de signature HMAC-SHA256** (`timestamp.corps`) — un faux webhook est rejeté.
- **Double filet** : si le webhook tarde, le serveur re-vérifie lui-même le statut auprès de l'API GeniusPay quand le front interroge le paiement.
- **Anti-contournement** : le champ `mis_en_avant` n'est jamais modifiable via l'API publique — seuls un paiement confirmé ou l'admin peuvent l'activer.
- Chaque paiement est tracé en base : référence interne `HPC-…`, référence GeniusPay `MTX-…`, montant, devise (XOF), statut (en attente / réussi / échoué / annulé / expiré), payloads bruts conservés (audit), horodatage.
- **Mode simulation en développement** : sans clés API (`GENIUSPAY_API_KEY/SECRET` vides + `DEBUG=True`), un bouton « Simuler le paiement (dev) » remplace le checkout — le circuit complet reste identique. Indisponible en production.
- Clés sandbox (`pk_sandbox_…`) et live (`pk_live_…`) interchangeables via `.env` sans toucher au code.

---

## 4. Événements 🆕

### 4.1 Agenda des événements
- Page **/evenements** (onglet « Événements », aussi dans la barre mobile).
- Publiés par les **promoteurs** : match exhibition, camp d'entraînement, concours de dunks/shoots, animation/show, événement caritatif, autre.
- Onglets : **À venir** (défaut) / **Tous** / **Mes événements** (si promoteur).
- Filtres : recherche texte, type, commune (+ API : dates, gratuit).
- Carte événement : affiche ou dégradé, badge statut (À venir / En cours / Terminé / Annulé), type, commune, dates, **nombre d'intéressés ★**, **prix d'entrée** (« Gratuit » si 0), nom et rôle du publieur.
- Chip « 🏆 Top promoteurs » vers le classement.

### 4.2 Fiche événement
- Couverture, badges, titre, lieu.
- Tuiles : dates, **heure** (optionnelle), prix d'entrée, nombre d'intéressés.
- Description, bloc **« Publié par »** (avatar, nom, rôle, commune, téléphone de contact).
- Bouton **« Je suis intéressé »** (toggle, connecté ; compteur en temps réel) — masqué si événement terminé/annulé.
- **Le propriétaire** peut changer le statut de son événement directement sur la fiche.

### 4.3 Création d'événement
- Réservée aux promoteurs : titre, type, description, commune, lieu, dates, heure, prix d'entrée, contact, affiche.
- Publication immédiate dans l'agenda.

---

## 5. Joueurs, statistiques et grades

### 5.1 Profil joueur
- Créé **automatiquement** à l'inscription d'un joueur (signal backend).
- Champs éditables : poste (Meneur, Arrière, Ailier, Ailier fort, Pivot), taille (cm), date de naissance, bio publique.

### 5.2 Statistiques vérifiées (infalsifiables)
- **Tournois joués, tournois gagnés, taux de victoire, titres de MVP** — calculés **uniquement** par une tâche Celery à partir des résultats officiels saisis par les promoteurs. Aucune vue ne peut les modifier à la main.
- Recalcul automatique de tous les participants à chaque saisie de résultat.

### 5.3 Grades de joueur (Bronze → Légende) 🆕
- **Barème de points** automatique : **10 pts** par tournoi joué · **30 pts** par tournoi gagné · **50 pts** par titre de MVP.
- **Seuils** : 🥉 Bronze 0+ · 🥈 Argent 100+ · 🥇 Or 300+ · 💠 Platine 700+ · 🔥 Légende 1 500+.
- Le grade **évolue tout seul** avec les résultats (recalculé par la même tâche Celery que les stats) — impossible à trafiquer.
- Affichage : **badge coloré** à côté du nom (cartes joueur, fiche publique, profil, marché), **barre de progression** vers le grade suivant (« Plus que 100 points pour passer Or »), panneau « Grade » sur la fiche avec les 5 paliers (le grade actuel en surbrillance), encart « Comment fonctionnent les grades ? » sur l'annuaire.
- **Filtre par grade** dans l'annuaire et sur le marché ; tri possible par points via l'API.

### 5.4 Annuaire des joueurs
- Page **/joueurs**, deux onglets : **« Sur le marché »** (joueurs disponibles) / **« Tous les joueurs »**.
- Filtres : recherche (nom, commune), poste, commune, **grade** + « Effacer ».
- Carte joueur : avatar (photo ou initiales, couleur selon le taux de victoire), nom + badge vérifié ✔ + **badge de grade**, poste · commune · taille, **barre de taux de victoire** avec nombre de tournois, extrait de l'annonce (marché), badge « En avant » pour les profils boostés.

### 5.5 Fiche joueur publique
- En-tête : grand avatar, nom, badge vérifié, **badge de grade**, poste/commune/taille, pill « n× MVP ».
- 4 compteurs : Joués · Gagnés · % Victoires · MVP (avec mention « calculées automatiquement »).
- **Panneau Grade** : progression, paliers, barème.
- Bio, bouton **« Envoyer une offre »** (voir § 6) — masqué sur son propre profil.
- Profil mineur : identité masquée (voir § 1.3).

---

## 6. Marché de talents et offres

### 6.1 Carte de transfert (joueur)
- Le joueur active/désactive sa **disponibilité** sur le marché (interrupteur).
- Annonce : « ce que je recherche » + « mes prétentions » (niveau, zone, défraiement…).
- **Badge vérifié** ✔ : accordé par l'admin (action dédiée dans le back-office).
- **Mise en avant** (boost avec date d'expiration) : gérée par l'admin — badge « En avant » + priorité de tri.

### 6.2 Offres privées
- Un recruteur (client ou promoteur) envoie une **offre privée** à un joueur disponible depuis sa fiche (message libre : contexte, défraiement, prime…).
- Contrôles serveur : pas d'offre à soi-même, uniquement vers un joueur avec carte active.
- Page **Offres** : reçues et envoyées, avec statut (En attente / Acceptée / Refusée).
- **Seul le joueur ciblé** peut accepter ou refuser ; une offre déjà traitée ne peut plus changer.
- Mention légale : HoopCI met en relation mais n'est pas partie à l'accord conclu.

### 6.3 Suggestions automatiques pour les recruteurs 🆕
- **Chaque recherche filtrée** d'un recruteur (poste, commune, grade, texte) est mémorisée automatiquement, sur l'annuaire comme sur le marché.
- Les **offres déjà envoyées comptent double** dans les habitudes (poste et commune des joueurs ciblés).
- Section **« Suggérés pour toi »** en haut du marché : jusqu'à 4 profils notés selon
  poste recherché (+30), commune habituelle (+20), grade ciblé (+15), **performances réelles** (taux de victoire, MVP, points de grade), boost/badge vérifié.
- Chaque suggestion affiche **ses raisons** : « Poste que tu recherches souvent », « À Abobo, ta zone de recherche », « Grade Argent que tu cibles », « 57 % de victoires », « 1× MVP », « Profil vérifié ».
- Les joueurs **déjà contactés** et les profils **sans aucun signal** sont écartés ; s'affine à chaque visite.

---

## 7. Classement des promoteurs 🆕

- Page **/promoteurs** (onglet « Top promoteurs ») — publique.
- **Podium visuel** des 3 meilleurs (le n° 1 au centre, mis en valeur) + liste classée du reste avec avatar, commune, activité et score.
- **Formule de score transparente** (affichée en bas de page) :
  `tournois terminés ×25 + tournois publiés ×10 + événements ×15 + équipes attirées ×5 + intéressés aux événements ×2`
- Calculée en direct depuis la base — impossible à gonfler artificiellement.

---

## 8. Interface & expérience

- **PWA installable** : manifest français, icônes générées depuis le logo, mise à jour automatique du service worker, cache réseau (API : NetworkFirst, médias : CacheFirst) — consultation partielle hors ligne.
- **Mobile-first** : barre de navigation basse à **6 boutons** (Accueil, Événements, bouton central « + Créer » pour orga/promoteur ou « ★ Favoris » pour les autres, Joueurs, Offres, Profil/Mes tournois/Connexion selon le contexte) ; navigation desktop complète dans l'en-tête (Tournois, Événements, Joueurs, Palmarès, Top orgas, Offres, Favoris, Mes tournois).
- **Thème sombre / clair** : bouton ☀/🌙, préférence système par défaut, persisté, couleur de la barre système synchronisée.
- **Design FIBA 3x3 × Côte d'Ivoire** : orange #F87306 / vert #009E60, typo Barlow Condensed italique, éléments skewés, bande tricolore.
- **Retours utilisateur** : toasts (succès / erreur / info), spinners de chargement, états vides illustrés avec messages contextuels, messages d'erreur API traduits en français lisible.
- **Accessibilité** : navigation clavier sur les cartes (Enter), labels ARIA sur les boutons d'icônes, contrastes travaillés dans les deux thèmes.
- **Performance** : cache de requêtes (react-query, 5 min), invalidations ciblées après chaque action, images en lazy-loading.
- En-tête : logo cliquable, avatar (photo ou initiales) → profil, bouton « Créer un tournoi » (promoteur).
- Footer : contact `contact@hoopci.ci`, bande tricolore.

---

## 9. Dashboard d'administration externe 🆕

Application **totalement séparée** (`admin-dashboard/`) : elle communique avec le site
principal **uniquement par API** (JWT) et peut être **hébergée sur un autre hébergeur**
(Netlify, Vercel, second VPS, sous-domaine…). URL du backend configurable via `VITE_API_URL`.

- **Connexion réservée au staff** : un compte non-admin est refusé (contrôle front **et** serveur `IsAdminUser` sur toute l'API `/api/admin/…`).
- **Vue d'ensemble** : revenus GeniusPay confirmés et en attente (FCFA), **graphique des revenus par mois** (avec table de données), utilisateurs par rôle, tournois par statut, grades des joueurs, paiements et offres par statut, indicateurs du marché.
- **Paiements** : toutes les transactions — référence interne HPC / référence GeniusPay MTX, client (nom + e-mail), tournoi concerné, **montant**, statut, mode (GeniusPay réel ou simulation dev), date — filtrables par statut, avec totaux en tête.
- **Utilisateurs** : recherche, filtre par rôle, **changement de rôle**, **désactivation / réactivation** (impossible de toucher un superutilisateur ou son propre compte).
- **Tournois** : changement de statut, **promotion offerte ★** (geste commercial) ou retrait, **suppression** définitive.
- **Événements** : changement de statut, suppression.
- **Marché** : **badge vérifié** et **mise en avant** des cartes de transfert.
- Navigation par ancres (`#paiements`, `#tournois`…), thème sombre HoopCI, tableaux denses.
- Déploiement : `npm run build` → site statique ; côté backend, ajouter le domaine du dashboard à `CORS_ALLOWED_ORIGINS` (voir `admin-dashboard/README.md`).

## 9 bis. Back-office admin (Django)

Interface d'administration technique sur `/admin/` (secours et actions fines) :
- **Utilisateurs** : gestion des comptes, rôles, mineurs.
- **Tournois / Équipes / Participations / Résultats** : modération et corrections.
- **Cartes de transfert** : action groupée **« Accorder le badge vérifié »**, gestion des mises en avant.
- **Offres** : consultation et modération.
- **Événements & intéressés** : filtres par type/statut/commune, recherche.
- **Paiements** : suivi des transactions GeniusPay (références, statuts, payloads bruts en lecture seule).
- **Recherches recruteurs** : visibilité sur les habitudes enregistrées.

---

## 10. API REST — endpoints principaux

| Méthode & endpoint | Description |
|---|---|
| `POST /api/auth/register/` · `POST /api/auth/login/` · `POST /api/auth/logout/` · `POST /api/auth/token/refresh/` | Comptes & JWT |
| `GET/PATCH /api/auth/me/` | Mon compte (photo en multipart) |
| `GET /api/promoteurs/` | **Classement des promoteurs** |
| `GET/POST /api/tournaments/` · `GET/PATCH/DELETE /api/tournaments/{id}/` | Tournois (création promoteur) |
| `POST /api/tournaments/{id}/favori/` · `equipes/` · `rejoindre/` · `resultat/` | Actions tournoi (résultat avec **finaliste + scores**) |
| `GET /api/tournaments/mes-tournois/` · `favoris/` | Espaces personnels |
| `GET /api/tournaments/recommandes/` | **Recommandations joueur** (avec raisons) |
| `GET /api/tournaments/palmares/?commune=` | **Palmarès public** |
| `GET /api/tournaments/classement-equipes/` | **Classement des équipes** (victoires, finales, points) |
| `GET/POST /api/events/` · `GET/PATCH/DELETE /api/events/{id}/` | Événements |
| `POST /api/events/{id}/interesse/` · `GET /api/events/mes-evenements/` | Intérêt & espace publieur |
| `GET /api/players/?grade=&poste=&commune=` · `GET /api/players/{id}/` | Annuaire (recherches recruteurs tracées) |
| `GET/PATCH /api/players/moi/` | Mon profil joueur |
| `GET /api/market/cartes/` · `GET/PUT/PATCH /api/market/cartes/moi/` | Marché & ma carte |
| `GET /api/market/cartes/suggestions/` | **Suggestions recruteur** (avec raisons) |
| `GET/POST /api/market/offres/` · `PATCH /api/market/offres/{id}/` | Offres |
| `POST /api/payments/tournois/{id}/initier/` | **Initier le paiement GeniusPay** (5 000 FCFA) |
| `GET /api/payments/{ref}/` · `POST /api/payments/{ref}/simuler/` | Statut (polling) · simulation dev |
| `POST /api/payments/webhook/genius/` | Webhook GeniusPay (signature HMAC vérifiée) |
| `GET /api/admin/stats/` | **Stats globales** (staff uniquement) |
| `GET /api/admin/paiements/` · `utilisateurs/` · `tournois/` · `evenements/` · `cartes/` | **Gestion admin** (staff uniquement — GET/PATCH/DELETE selon la ressource) |

Toutes les listes supportent pagination (20/page), recherche (`?search=`) et tri (`?ordering=`).

---

## 11. Pour développer / tester

```bash
# Backend (SQLite + Celery en mode synchrone, aucun service externe requis)
cd backend
.venv\Scripts\activate
python manage.py migrate
python manage.py runserver

# Frontend (proxy /api automatique)
cd frontend
npm run dev                       # http://localhost:5173

# Dashboard admin (application séparée)
cd admin-dashboard
npm install && npm run dev        # http://localhost:5174 (compte superuser Django : createsuperuser)
```

**Variables `.env` utiles** : `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET` (vides = mode simulation en dev), `GENIUSPAY_BASE_URL`, `FRONTEND_URL` (redirections checkout), `TARIF_PUBLICATION_TOURNOI` (5000 par défaut).

**Avant la mise en production du paiement** : créer le compte marchand GeniusPay, renseigner les clés live, déclarer le webhook `https://<domaine>/api/payments/webhook/genius/` dans le dashboard GeniusPay.

---

## 12. Hors périmètre v1 (prévu plus tard)
Notifications push in-app · classement complet des équipes · signalements de contenus · pages légales · billetterie payante · streaming · application native iOS/Android · extension hors Côte d'Ivoire.
