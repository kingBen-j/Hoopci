from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

# Utiliser le magasin de certificats du système plutôt que celui embarqué par Python :
# indispensable en dev Windows quand un antivirus (Avast…) intercepte le HTTPS,
# sans quoi les appels sortants (GeniusPay) échouent en CERTIFICATE_VERIFY_FAILED.
# Paquet absent en production (requirements/render.txt) → simplement ignoré.
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

# Clé secrète : depuis l'environnement en priorité. À défaut, une clé aléatoire est
# générée pour que l'app démarre quand même (déploiement sans config). ATTENTION :
# une clé générée change à chaque redémarrage → les sessions/JWT sont invalidés.
# En vraie production, TOUJOURS définir DJANGO_SECRET_KEY.
from django.core.management.utils import get_random_secret_key  # noqa: E402
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or get_random_secret_key()

# Chemin de l'admin Django — surchargé en production pour ne pas exposer /admin/
# (les bots scannent ce chemin en permanence). Doit finir par « / ».
ADMIN_URL = os.environ.get('DJANGO_ADMIN_URL', 'admin/')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    # Local
    'apps.accounts',
    'apps.tournaments',
    'apps.players',
    'apps.market',
    'apps.events',
    'apps.payments',
    'apps.core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hoopci.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hoopci.wsgi.application'

AUTH_USER_MODEL = 'accounts.Utilisateur'

# Base PostgreSQL par variables séparées (VPS / production.py). development.py et
# render.py REMPLACENT ce bloc (SQLite / DATABASE_URL) : on utilise donc .get() pour
# ne pas crasher à l'import quand DB_NAME n'est pas défini (ex. déploiement Render).
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', ''),
        'USER': os.environ.get('DB_USER', ''),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Abidjan'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# GeniusPay — https://pay.genius.ci/doc (sans clés : mode simulation en DEBUG)
GENIUSPAY_BASE_URL = os.environ.get('GENIUSPAY_BASE_URL', 'https://pay.genius.ci')
GENIUSPAY_API_KEY = os.environ.get('GENIUSPAY_API_KEY', '')
GENIUSPAY_API_SECRET = os.environ.get('GENIUSPAY_API_SECRET', '')
# URL du frontend pour les redirections success/error du checkout
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
# Tarif de la promotion optionnelle d'un tournoi (badge « Promu », tête de liste) — FCFA
TARIF_PUBLICATION_TOURNOI = int(os.environ.get('TARIF_PUBLICATION_TOURNOI', '5000'))
# Tarif de publication d'un tournoi — obligatoire avant parution dans l'annuaire (FCFA)
TARIF_CREATION_TOURNOI = int(os.environ.get('TARIF_CREATION_TOURNOI', '2000'))
# Part plateforme sur l'inscription d'une équipe à un tournoi (FCFA) —
# encaissée avec les frais d'inscription du tournoi en un seul paiement
TARIF_INSCRIPTION_EQUIPE = int(os.environ.get('TARIF_INSCRIPTION_EQUIPE', '500'))
# Promotion du compte joueur (tête du marché + points de grade boostés), 30 jours
TARIF_PROMOTION_COMPTE = int(os.environ.get('TARIF_PROMOTION_COMPTE', '1000'))
DUREE_PROMOTION_COMPTE_JOURS = int(os.environ.get('DUREE_PROMOTION_COMPTE_JOURS', '30'))
# Promotion d'une équipe inscrite à un tournoi (badge + points de grade boostés)
TARIF_PROMOTION_EQUIPE = int(os.environ.get('TARIF_PROMOTION_EQUIPE', '1000'))

CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = TIME_ZONE
