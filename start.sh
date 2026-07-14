#!/usr/bin/env bash
# Start Command pour un service Render dont le Root Directory est la RACINE du dépôt.
# Fait tout ce qu'il faut depuis backend/ : migrations, statiques, puis gunicorn.
# (Le déploiement propre passe plutôt par render.yaml + build.sh.)
set -o errexit

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-hoopci.settings.render}"

cd backend
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn hoopci.wsgi:application --bind "0.0.0.0:$PORT" --workers 2
