#!/bin/bash
set -e

# Eliminar cualquier config cacheada para que las vars de entorno se lean frescas
php artisan config:clear
php artisan route:clear

# ── Validar que DB_HOST esté resuelto ───────────────────────────────────────
# Las reference variables de Railway (${{ postgres.PGHOST }}) se inyectan en
# tiempo de ejecución. Si el contenedor arranca antes de que estén listas,
# DB_HOST puede llegar vacío o con el literal sin expandir.
echo "[start.sh] DB_HOST='${DB_HOST}'"
echo "[start.sh] DB_PORT='${DB_PORT}'"
echo "[start.sh] DB_DATABASE='${DB_DATABASE}'"

if [[ -z "$DB_HOST" || "$DB_HOST" == *"={{"* || "$DB_HOST" == "port="* ]]; then
    echo "[start.sh] ERROR: DB_HOST está vacío o no fue resuelto correctamente: '${DB_HOST}'"
    echo "[start.sh] Verifica que las reference variables de Railway estén configuradas."
    exit 1
fi

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

# ── Esperar a que la base de datos esté lista (retry con backoff) ────────────
# Reintenta la conexión hasta MAX_RETRIES veces con espera exponencial para
# tolerar el tiempo de arranque del servicio PostgreSQL.
MAX_RETRIES=10
RETRY_DELAY=2
attempt=1

until php -r "
\$host   = getenv('DB_HOST');
\$port   = getenv('DB_PORT')    ?: '5432';
\$dbname = getenv('DB_DATABASE');
\$user   = getenv('DB_USERNAME');
\$pass   = getenv('DB_PASSWORD');
\$ssl    = getenv('DB_SSLMODE') ?: 'prefer';
\$dsn = \"pgsql:host=\$host;port=\$port;dbname=\$dbname;sslmode=\$ssl\";
try {
    new PDO(\$dsn, \$user, \$pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    exit(0);
} catch (Exception \$e) {
    fwrite(STDERR, '[start.sh] DB no disponible: ' . \$e->getMessage() . \"\n\");
    exit(1);
}
" 2>&1; do
    if [[ $attempt -ge $MAX_RETRIES ]]; then
        echo "[start.sh] ERROR: La base de datos no respondió después de $MAX_RETRIES intentos. Abortando."
        exit 1
    fi
    echo "[start.sh] Intento $attempt/$MAX_RETRIES fallido. Reintentando en ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    attempt=$((attempt + 1))
    RETRY_DELAY=$((RETRY_DELAY * 2))
done

echo "[start.sh] Conexión a la base de datos establecida."

# ── Crear el schema 'cup' si no existe ──────────────────────────────────────
# (La BD empieza vacía; si cup no existe, migrate falla con 3F000)
php -r "
\$host   = getenv('DB_HOST');
\$port   = getenv('DB_PORT')    ?: '5432';
\$dbname = getenv('DB_DATABASE');
\$user   = getenv('DB_USERNAME');
\$pass   = getenv('DB_PASSWORD');
\$ssl    = getenv('DB_SSLMODE') ?: 'prefer';

\$dsn = \"pgsql:host=\$host;port=\$port;dbname=\$dbname;sslmode=\$ssl\";
try {
    \$pdo = new PDO(\$dsn, \$user, \$pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    \$pdo->exec('CREATE SCHEMA IF NOT EXISTS cup');
    echo \"[start.sh] Schema cup: OK\n\";
} catch (Exception \$e) {
    echo '[start.sh] ADVERTENCIA schema: ' . \$e->getMessage() . \"\n\";
    // No abortamos: el schema puede ya existir o no ser necesario en este entorno.
}
"

# ── Migraciones y datos semilla ──────────────────────────────────────────────
php artisan migrate --force
php artisan db:seed --force

# ── Iniciar Apache en foreground ─────────────────────────────────────────────
exec apache2-foreground
