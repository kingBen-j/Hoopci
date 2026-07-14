"""Pont pour la Start Command Render par défaut « gunicorn your_application.wsgi ».

Render détecte un service Python et lance cette commande générique quand aucune
n'est configurée. Ce module charge l'application Django réelle (backend/hoopci),
prépare la base et les fichiers statiques au premier chargement, pour un
déploiement sans aucune configuration dans le tableau de bord.

Le déploiement propre reste render.yaml + Blueprint (service Python natif,
Start Command « gunicorn hoopci.wsgi:application » depuis rootDir backend).
"""
import logging
import os
import sys
from pathlib import Path

# Rendre le projet Django (backend/hoopci) importable depuis la racine du dépôt
BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hoopci.settings.render")

import django  # noqa: E402

django.setup()

# Migrations + fichiers statiques au démarrage (la Start Command par défaut de
# Render ne fait que lancer gunicorn ; on prépare donc l'app ici).
from django.core.management import call_command  # noqa: E402

try:
    call_command("migrate", "--noinput")
    call_command("collectstatic", "--noinput")
except Exception as exc:  # pragma: no cover - ne pas empêcher le démarrage
    logging.getLogger("django").warning("Préparation au démarrage impossible : %s", exc)

# Compte admin (optionnel) : créé — ou corrigé — au démarrage si DJANGO_SUPERUSER_EMAIL
# et DJANGO_SUPERUSER_PASSWORD sont présents. USERNAME et ROLE ont des valeurs par
# défaut (donc seules 2 variables suffisent). Le mot de passe est (re)positionné à
# chaque démarrage pour garantir la connexion. À retirer une fois le compte en place.
_su_email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
_su_password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
if _su_email and _su_password:
    try:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=_su_email,
            defaults={
                "username": os.environ.get("DJANGO_SUPERUSER_USERNAME") or _su_email.split("@")[0],
                "role": os.environ.get("DJANGO_SUPERUSER_ROLE") or "client",
            },
        )
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(_su_password)
        user.save()
        logging.getLogger("django").warning(
            "Compte admin %s : %s", "CRÉÉ" if created else "mis à jour", _su_email
        )
    except Exception as exc:  # pragma: no cover
        logging.getLogger("django").error("Création du compte admin ÉCHOUÉE : %s", exc)

from hoopci.wsgi import application  # noqa: E402,F401  (chargé par gunicorn)
