#!/bin/bash
set -e

# Eliminar cualquier config cacheada (si fue bakeada durante el build con valores locales)
php artisan config:clear
php artisan route:clear

# Ejecutar migraciones y seed (firstOrCreate hace el seed idempotente)
php artisan migrate --force
php artisan db:seed --force

# Iniciar Apache en foreground
exec apache2-foreground
