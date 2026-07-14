"""Réglages pour l'hébergement Render (render.com) — services définis dans render.yaml.

Différences avec production.py (qui cible le VPS nginx + Redis) :
- Postgres fourni par Render via DATABASE_URL
- WhiteNoise sert les statiques (pas de nginx), Django sert les médias
- Pas de Redis sur le plan gratuit : cache mémoire et Celery synchrone
"""
import os

import dj_database_url

from .base import *

DEBUG = False

# Render injecte le hostname public du service (xxx.onrender.com) ;
# ALLOWED_HOSTS permet d'ajouter un domaine custom en plus.
ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Origines autorisées à appeler l'API depuis un navigateur (dashboard admin, etc.).
# Le dashboard peut être hébergé sur Render, Vercel ou Netlify → on autorise ces
# domaines. CORS_ALLOWED_ORIGINS permet d'ajouter un domaine custom. L'API utilise
# des JWT (localStorage, pas de cookies), donc élargir le CORS reste sûr.
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://[\w-]+\.onrender\.com$',
    r'^https://[\w-]+\.vercel\.app$',
    r'^https://[\w-]+\.netlify\.app$',
]

CSRF_TRUSTED_ORIGINS = [f"https://{h}" for h in ALLOWED_HOSTS]

# TLS terminé par le proxy Render (X-Forwarded-Proto). On force le HTTPS mais on
# exempte le health check, appelé en HTTP interne par Render (sinon 301 → échec).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'

# Admin Django masqué : les bots scannent /admin/ en permanence.
# Personnalisable via DJANGO_ADMIN_URL dans le dashboard Render.
ADMIN_URL = os.environ.get('DJANGO_ADMIN_URL', 'gestion-hoopci-x7k2/')

# Base de données : Postgres via DATABASE_URL (recommandé). À défaut, repli SQLite
# pour que l'app démarre sans config — mais le disque Render est ÉPHÉMÈRE : les
# données SQLite sont PERDUES à chaque redéploiement. Ajoute une base PostgreSQL
# Render et sa DATABASE_URL dès que possible.
if not os.environ.get('DATABASE_URL'):
    import logging
    logging.getLogger('django').warning(
        'DATABASE_URL absent → SQLite ÉPHÉMÈRE (données perdues à chaque redéploiement). '
        'Ajoute une base PostgreSQL Render et sa DATABASE_URL.'
    )
DATABASES = {'default': dj_database_url.config(
    default=f"sqlite:///{BASE_DIR / 'render_fallback.db'}", conn_max_age=600,
)}

# WhiteNoise sert les statiques (admin Django) directement depuis gunicorn
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

# Servir la PWA (build Vite) depuis le même service : un seul domaine sert l'API
# (/api) ET le site React (tout le reste), sans CORS. WhiteNoise sert les fichiers
# du build (assets, manifest, sw.js…) ; le fallback SPA est dans hoopci/urls.py.
FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'
if FRONTEND_DIST.exists():
    WHITENOISE_ROOT = str(FRONTEND_DIST)
    WHITENOISE_INDEX_FILE = True

# Django sert aussi les médias (voir hoopci/urls.py). Attention : le disque Render
# est éphémère, les uploads disparaissent à chaque déploiement — prévoir un disque
# persistant ou un stockage externe pour la production réelle.
SERVE_MEDIA = True

# Celery en mode synchrone — la seule tâche (recalcul des stats joueur) est légère
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Anti-abus : mêmes limites de débit que production.py (cache mémoire par défaut)
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '300/min',
    },
    # API JSON pure en production : pas d'interface DRF navigable exposée
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
}

# Logs vers stdout — capturés par Render
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}

# Supervision des erreurs — activée seulement si SENTRY_DSN est renseigné
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1, send_default_pii=False)
