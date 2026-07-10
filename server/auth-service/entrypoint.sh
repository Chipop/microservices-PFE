#!/bin/sh
set -e
mkdir -p /app/data
python manage.py migrate --noinput
exec python manage.py runserver 0.0.0.0:8000