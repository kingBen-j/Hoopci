#!/usr/bin/env bash
# Start Command pour un service Render à Root Directory = racine du dépôt.
# Robuste même si le service est de type Node (yarn start) : on crée un virtualenv
# isolé (contourne 'externally-managed-environment' PEP 668) avec un chemin fixe
# pour python et gunicorn, puis on lance Django.
# (Le déploiement propre reste render.yaml + Blueprint → service Python natif.)
set -o errexit

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-hoopci.settings.render}"

# python ou python3 selon l'image Render
PYTHON="$(command -v python || command -v python3)"
echo ">> Interpréteur système : $PYTHON ($("$PYTHON" --version 2>&1))"

# Virtualenv isolé, installé une seule fois par déploiement
VENV="$PWD/.venv-render"
if [ ! -x "$VENV/bin/gunicorn" ]; then
  echo ">> Installation de l'environnement Python (patiente ~1 min)…"
  "$PYTHON" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --no-cache-dir --upgrade pip
  "$VENV/bin/python" -m pip install --no-cache-dir -r backend/requirements/render.txt
fi

cd backend
"$VENV/bin/python" manage.py migrate --noinput
"$VENV/bin/python" manage.py collectstatic --noinput
exec "$VENV/bin/gunicorn" hoopci.wsgi:application --bind "0.0.0.0:$PORT" --workers "${WEB_CONCURRENCY:-2}"
