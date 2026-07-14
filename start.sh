#!/usr/bin/env bash
# Start Command pour un service Render à Root Directory = racine du dépôt.
# Robuste même si le service est de type Node (yarn start) : on installe et on
# lance avec le MÊME interpréteur python, et on retrouve gunicorn hors PATH.
# (Le déploiement propre reste render.yaml + Blueprint → service Python natif.)
set -o errexit

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-hoopci.settings.render}"

# python ou python3 selon l'image Render
PYTHON="$(command -v python || command -v python3)"
echo ">> Interpréteur : $PYTHON"
"$PYTHON" --version || true

cd backend

# Django visible par CE python ? Sinon (service typé Node), on installe les deps
# avec ce même python pour qu'elles soient sur son chemin.
if ! "$PYTHON" -c "import django" 2>/dev/null; then
  echo ">> Django introuvable pour cet interpréteur — installation des dépendances…"
  "$PYTHON" -m pip install --no-cache-dir -r requirements/render.txt
fi

"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py collectstatic --noinput

# gunicorn : script console installé à côté de python (souvent hors PATH sur Node)
GUNICORN="$(command -v gunicorn || echo "$(dirname "$PYTHON")/gunicorn")"
echo ">> gunicorn : $GUNICORN"
exec "$GUNICORN" hoopci.wsgi:application --bind "0.0.0.0:$PORT" --workers "${WEB_CONCURRENCY:-2}"
