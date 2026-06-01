#!/bin/bash
set -e

# Eliminar cualquier config cacheada para que las vars de Render se lean frescas
php artisan config:clear
php artisan route:clear

# ── Crear el schema 'cup' si no existe ──────────────────────────────────────
# Se usa PDO directo (sin search_path de Laravel) porque si el schema 'cup'
# todavía no existe en la BD, el migrate falla con "no schema has been selected".
# Conectamos al schema 'public' por defecto y creamos 'cup' ahí.
php -r "
\$host   = getenv('DB_HOST');
\$port   = getenv('DB_PORT')     ?: '5432';
\$dbname = getenv('DB_DATABASE');
\$user   = getenv('DB_USERNAME');
\$pass   = getenv('DB_PASSWORD');
\$ssl    = getenv('DB_SSLMODE')  ?: 'require';

\$dsn = \"pgsql:host=\$host;port=\$port;dbname=\$dbname;sslmode=\$ssl\";
try {
    \$pdo = new PDO(\$dsn, \$user, \$pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    \$pdo->exec('CREATE SCHEMA IF NOT EXISTS cup');
    echo \"[start.sh] Schema 'cup' listo.\n\";
} catch (Exception \$e) {
    echo '[start.sh] ERROR creando schema cup: ' . \$e->getMessage() . \"\n\";
    exit(1);
}
"

# ── Migraciones y datos semilla ──────────────────────────────────────────────
php artisan migrate --force
php artisan db:seed --force

# ── Iniciar Apache en foreground ─────────────────────────────────────────────
exec apache2-foreground
