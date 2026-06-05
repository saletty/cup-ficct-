#!/bin/bash
set -e

# Eliminar cualquier config cacheada para que las vars de entorno se lean frescas
php artisan config:clear
php artisan route:clear

# ── Usar DNS privado de Railway si DB_HOST está vacío ────────────────────────
# Las reference variables (${{ postgres.PGHOST }}) se inyectan en tiempo de
# ejecución, pero el start.sh se ejecuta antes. Usamos el DNS privado de Railway
# que siempre está disponible: <service-name>.railway.internal
if [[ -z "$DB_HOST" ]]; then
    export DB_HOST="postgres.railway.internal"
    echo "[start.sh] DB_HOST vacío → usando DNS privado: $DB_HOST"
fi

# Defaults para puerto y base de datos
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-railway}"
DB_USERNAME="${DB_USERNAME:-postgres}"

echo "[start.sh] Conectando a: $DB_HOST:$DB_PORT/$DB_DATABASE"

# ── Esperar a que la base de datos esté lista (retry con backoff) ────────────
MAX_RETRIES=10
RETRY_DELAY=2
attempt=1

until php -r "
\$host   = '$DB_HOST';
\$port   = '$DB_PORT';
\$dbname = '$DB_DATABASE';
\$user   = '$DB_USERNAME';
\$pass   = getenv('DB_PASSWORD') ?: '';
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
php -r "
\$host   = '$DB_HOST';
\$port   = '$DB_PORT';
\$dbname = '$DB_DATABASE';
\$user   = '$DB_USERNAME';
\$pass   = getenv('DB_PASSWORD') ?: '';
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

# ── Iniciar Apache en foreground ────────────────────────────────────────────
exec apache2-foreground

