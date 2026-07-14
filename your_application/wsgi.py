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

from hoopci.wsgi import application  # noqa: E402,F401  (chargé par gunicorn)
