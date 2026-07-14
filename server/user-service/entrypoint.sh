#!/bin/sh
set -e
mkdir -p /app/data
python manage.py migrate --noinput
python manage.py consume_events &
exec python manage.py runserver 0.0.0.0:8000
