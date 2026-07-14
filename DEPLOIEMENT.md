# Déploiement HoopCI en production (VPS Ubuntu)

Architecture : **nginx** (TLS, statiques, proxy) → **gunicorn** (API Django, port 8000)
+ **PostgreSQL** + **Redis** (Celery db 0, cache db 1) + **Celery** (stats joueurs).
Le frontend React (PWA) est un build statique servi directement par nginx.

## 1. Prérequis système

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-dev build-essential \
    postgresql redis-server nginx certbot python3-certbot-nginx git
# Node 20 (build du frontend sur le VPS — sinon builder en local et uploader dist/)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

## 2. Base de données PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER hoopci WITH PASSWORD 'MOT_DE_PASSE_FORT';
CREATE DATABASE hoopci OWNER hoopci;
SQL
```

## 3. Code et environnement Python

```bash
sudo mkdir -p /var/www/hoopci && sudo chown $USER /var/www/hoopci
git clone <URL_DU_DEPOT> /var/www/hoopci
cd /var/www/hoopci/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements/production.txt
```

## 4. Configuration `.env`

```bash
cp .env.production.example .env
nano .env   # remplir DJANGO_SECRET_KEY, DB_PASSWORD, clés GeniusPay, SMTP…
```

Générer la clé secrète :
```bash
.venv/bin/python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

> **Important** : pour toutes les commandes `manage.py` sur le VPS, exporter d'abord
> `export DJANGO_SETTINGS_MODULE=hoopci.settings.production`
> (le `.env` est lu trop tard pour choisir le module de settings ; gunicorn, lui,
> utilise la production par défaut via `wsgi.py`).

## 5. Migrations, statiques, compte admin

```bash
export DJANGO_SETTINGS_MODULE=hoopci.settings.production
.venv/bin/python manage.py migrate
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py check --deploy   # doit être propre
```

## 6. Build du frontend

```bash
cd /var/www/hoopci/frontend
npm ci && npm run build      # produit frontend/dist/ servi par nginx
```

## 7. Services systemd (gunicorn + Celery)

```bash
sudo cp /var/www/hoopci/deploy/hoopci-gunicorn.service /etc/systemd/system/
sudo cp /var/www/hoopci/deploy/hoopci-celery.service /etc/systemd/system/
sudo chown -R www-data:www-data /var/www/hoopci/backend/media /var/www/hoopci/backend/logs
sudo systemctl daemon-reload
sudo systemctl enable --now hoopci-gunicorn hoopci-celery
systemctl status hoopci-gunicorn hoopci-celery
```

## 8. nginx + HTTPS

```bash
sudo cp /var/www/hoopci/nginx/hoopci.conf /etc/nginx/sites-available/hoopci.conf
sudo ln -s /etc/nginx/sites-available/hoopci.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d hoopci.ci -d www.hoopci.ci   # génère les certificats Let's Encrypt
sudo nginx -t && sudo systemctl reload nginx
```

## 9. GeniusPay (paiements réels)

1. Créer le compte marchand sur https://pay.genius.ci et récupérer les clés **live**.
2. Renseigner `GENIUSPAY_API_KEY` / `GENIUSPAY_API_SECRET` dans `.env`, puis
   `sudo systemctl restart hoopci-gunicorn`.
3. Déclarer le webhook dans le dashboard GeniusPay :
   `https://hoopci.ci/api/payments/webhook/genius/`

Sans clés, l'initiation de paiement renvoie 503 (et la simulation reste bloquée hors DEBUG).

## 10. Vérification finale (smoke test)

```bash
curl -I https://hoopci.ci/                    # 200 — PWA
curl -s https://hoopci.ci/api/tournaments/ | head -c 200   # JSON de l'API
curl -I https://hoopci.ci/admin/login/        # 200 — admin Django
```

Puis dans le navigateur : inscription d'un compte test, création d'un tournoi,
vérification que l'upload d'affiche apparaît bien sous `/media/`.

## Admin-dashboard (optionnel, hébergement séparé)

```bash
cd /var/www/hoopci/admin-dashboard
VITE_API_URL=https://hoopci.ci npm ci && VITE_API_URL=https://hoopci.ci npm run build
```
Servir `admin-dashboard/dist/` où l'on veut (sous-domaine, Netlify…), puis ajouter
son origine à `CORS_ALLOWED_ORIGINS` dans le `.env` du backend et redémarrer gunicorn.
Réservé aux comptes `is_staff`.

## Mise à jour du site (déploiements suivants)

```bash
cd /var/www/hoopci && git pull
cd backend && .venv/bin/pip install -r requirements/production.txt
export DJANGO_SETTINGS_MODULE=hoopci.settings.production
.venv/bin/python manage.py migrate && .venv/bin/python manage.py collectstatic --noinput
cd ../frontend && npm ci && npm run build
sudo systemctl restart hoopci-gunicorn hoopci-celery
```
