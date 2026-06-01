#!/bin/bash
set -e

# Eliminar cualquier config cacheada para que las vars de Render se lean frescas
php artisan config:clear
php artisan route:clear

# ── Neon.tech: conexión directa para DDL ────────────────────────────────────
# El connection pooler de Neon (PgBouncer en modo transacción) rompe
# transacciones DDL multi-round-trip → SQLSTATE[25P02].
# Neon expone dos endpoints:
#   pooler:  ep-xxx-pooler.region.aws.neon.tech  (PgBouncer, para queries)
#   directo: ep-xxx.region.aws.neon.tech         (Postgres nativo, para DDL)
# Removemos "-pooler" del host para que migrate y seed usen la conexión directa.
if [[ "$DB_HOST" == *"-pooler"* ]]; then
    export DB_HOST="${DB_HOST/-pooler/}"
    echo "[start.sh] Pooler detectado → usando conexión directa: $DB_HOST"
fi

# ── Crear el schema 'cup' si no existe ──────────────────────────────────────
# (La BD de Neon empieza vacía; si cup no existe, migrate falla con 3F000)
php -r "
\$host   = getenv('DB_HOST');
\$port   = getenv('DB_PORT')    ?: '5432';
\$dbname = getenv('DB_DATABASE');
\$user   = getenv('DB_USERNAME');
\$pass   = getenv('DB_PASSWORD');
\$ssl    = getenv('DB_SSLMODE') ?: 'require';

\$dsn = \"pgsql:host=\$host;port=\$port;dbname=\$dbname;sslmode=\$ssl\";
try {
    \$pdo = new PDO(\$dsn, \$user, \$pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    \$pdo->exec('CREATE SCHEMA IF NOT EXISTS cup');
    echo \"[start.sh] Schema cup: OK\n\";
} catch (Exception \$e) {
    echo '[start.sh] ERROR schema: ' . \$e->getMessage() . \"\n\";
    exit(1);
}
"

# ── Migraciones y datos semilla ──────────────────────────────────────────────
php artisan migrate --force
php artisan db:seed --force

# ── Iniciar Apache en foreground ─────────────────────────────────────────────
exec apache2-foreground
