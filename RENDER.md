# Déployer HoopCI sur Render

Le fichier [`render.yaml`](render.yaml) décrit les 4 ressources : l'API Django
(`hoopci-backend`), la base Postgres (`hoopci-db`), le site public
(`hoopci-frontend`) et le dashboard admin (`hoopci-admin`).

## 1. Pousser le projet sur GitHub

Render déploie depuis un repo Git :

```bash
git init
git add .
git commit -m "HoopCI"
git remote add origin https://github.com/<ton-compte>/hoopci.git
git push -u origin main
```

## 2. Créer le Blueprint

1. Sur [dashboard.render.com](https://dashboard.render.com) : **New → Blueprint**.
2. Connecter le repo GitHub — Render lit `render.yaml` et propose les 4 ressources.
3. Valider. Le premier déploiement prend quelques minutes (build backend + 2 builds Vite).

## 3. Créer le compte admin

Sur le service **hoopci-backend** → *Environment*, ajouter puis redéployer :

| Variable | Exemple |
|---|---|
| `DJANGO_SUPERUSER_EMAIL` | `admin@hoopci.ci` |
| `DJANGO_SUPERUSER_PASSWORD` | *(mot de passe fort)* |
| `DJANGO_SUPERUSER_USERNAME` | `admin` |
| `DJANGO_SUPERUSER_ROLE` | `client` |

Le build crée le compte automatiquement (voir `backend/build.sh`).
Retirer ces variables ensuite. L'admin Django est sur
`https://hoopci-backend.onrender.com/admin/` et le dashboard sur
`https://hoopci-admin.onrender.com`.

## 4. Vérifier `FRONTEND_URL`

Si Render a suffixé le nom du frontend (ex. `hoopci-frontend-abc1.onrender.com`),
mettre à jour la variable `FRONTEND_URL` du backend — elle sert aux redirections
du checkout GeniusPay.

## Variables optionnelles (backend)

| Variable | Usage |
|---|---|
| `GENIUSPAY_API_KEY` / `GENIUSPAY_API_SECRET` | Paiements réels. Sans clés, l'initiation de paiement renvoie 503 (la simulation est réservée au mode DEBUG). |
| `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` | À renseigner si tu branches un domaine custom (ex. `hoopci.ci`). Les domaines `*.onrender.com` sont déjà acceptés. |
| `SENTRY_DSN` | Supervision des erreurs. |
| `REDIS_URL` | Inutilisé sur Render (Celery tourne en mode synchrone — voir `backend/hoopci/settings/render.py`). |

## Limites du plan gratuit

- **Le backend s'endort** après 15 min d'inactivité — la première requête suivante
  prend ~1 min (réveil du service).
- **Postgres gratuit expire après 30 jours** : passer sur un plan payant ou
  exporter les données avant l'échéance.
- **Les uploads (affiches, photos) sont éphémères** : le disque est réinitialisé à
  chaque déploiement. Pour du réel : ajouter un disque persistant Render (payant)
  monté sur `backend/media`, ou un stockage externe (S3, Cloudinary).

## Ce que fait la config Render (vs le VPS)

`backend/hoopci/settings/render.py` remplace `production.py` sur Render :
Postgres via `DATABASE_URL`, statiques servis par WhiteNoise, médias servis par
Django, cache mémoire et Celery synchrone (pas de Redis). Le déploiement VPS
décrit dans `DEPLOIEMENT.md` reste inchangé.
