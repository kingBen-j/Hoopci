#!/usr/bin/env bash
# Build Render — appelé comme buildCommand du service backend (voir render.yaml)
set -o errexit

pip install -r requirements/render.txt
python manage.py collectstatic --noinput
python manage.py migrate

# Premier compte admin : définir DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD,
# DJANGO_SUPERUSER_USERNAME et DJANGO_SUPERUSER_ROLE dans l'environnement Render
# (à retirer après le premier déploiement). Le || true évite l'échec si le compte existe.
if [[ -n "${DJANGO_SUPERUSER_EMAIL:-}" ]]; then
  python manage.py createsuperuser --noinput || true
fi
