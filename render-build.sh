#!/usr/bin/env bash
set -e

# Este script es solo para despliegues SIN Docker (nativo en Render).
# Para el despliegue Docker, todo corre en el Dockerfile + start.sh.

composer install --no-dev --optimize-autoloader
npm install
npm run build

# IMPORTANTE: NO correr config:cache aquí.
# config:cache congela DB_HOST=127.0.0.1 en el binario si las vars de BD
# no están disponibles en el momento del build, rompiendo la conexión en runtime.
