# HoopCI Admin — Dashboard d'administration autonome

Application **indépendante du site principal** : elle communique uniquement avec
l'API HoopCI (JWT) et peut être hébergée sur un autre serveur / hébergeur
(Netlify, Vercel, un second VPS, un sous-domaine…).

## Fonctionnalités
- Connexion réservée aux comptes **staff** (`is_staff`) — un compte normal est refusé.
- **Vue d'ensemble** : revenus GeniusPay confirmés / en attente, graphique des revenus
  par mois, utilisateurs par rôle, tournois par statut, grades des joueurs, offres, marché.
- **Paiements** : toutes les transactions (référence HPC/MTX, client, tournoi, montant,
  statut, mode GeniusPay ou simulation), filtrables par statut.
- **Utilisateurs** : recherche, changement de rôle, désactivation / réactivation.
- **Tournois** : changement de statut, promotion offerte (★) ou retrait, suppression.
- **Événements** : changement de statut, suppression.
- **Marché** : badge vérifié et mise en avant des cartes de transfert.

## Développement

```bash
cd admin-dashboard
npm install
npm run dev        # http://localhost:5174 (le backend doit tourner sur :8000)
```

Se connecter avec un compte staff Django (`python manage.py createsuperuser`).

## Configuration

| Variable | Rôle | Exemple |
|---|---|---|
| `VITE_API_URL` | URL du backend HoopCI (sans slash final) | `https://api.hoopci.ci` |

Créer un fichier `.env` (copie de `.env.example`) ou définir la variable au build.

## Déploiement sur un hébergeur séparé

1. `npm run build` → le dossier `dist/` est un site statique à déposer n'importe où
   (Netlify, Vercel, Nginx sur un autre VPS…).
2. Définir `VITE_API_URL=https://<domaine-du-backend>` **au moment du build**.
3. Côté backend (serveur principal), autoriser l'origine du dashboard dans le CORS :
   ajouter le domaine du dashboard à `CORS_ALLOWED_ORIGINS` dans le `.env` de
   production (ex. `CORS_ALLOWED_ORIGINS=https://hoopci.ci,https://admin.hoopci.ci`).
4. L'authentification passe par header `Authorization: Bearer …` (pas de cookies),
   donc aucun réglage CSRF n'est nécessaire pour le cross-origin.

> Sécurité : seuls les comptes `is_staff` passent la porte — l'API `/api/admin/…`
> le vérifie côté serveur (`IsAdminUser`), le front ne fait que refléter ce contrôle.
