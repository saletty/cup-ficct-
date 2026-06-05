#!/bin/bash
set -e

php artisan config:clear
php artisan route:clear

# Usar DATABASE_PUBLIC_URL o DATABASE_URL para sobreescribir las vars individuales
# (railway.internal no resuelve si la red privada no está habilitada)
_DB_URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}"
if [[ -n "$_DB_URL" ]]; then
    echo "[start.sh] Parseando URL pública de BD..."
    eval $(php -r "
        \$url = parse_url(getenv('DATABASE_PUBLIC_URL') ?: getenv('DATABASE_URL'));
        echo 'export DB_HOST=' . escapeshellarg(\$url['host']) . PHP_EOL;
        echo 'export DB_PORT=' . escapeshellarg(\$url['port'] ?? '5432') . PHP_EOL;
        echo 'export DB_DATABASE=' . escapeshellarg(ltrim(\$url['path'], '/')) . PHP_EOL;
        echo 'export DB_USERNAME=' . escapeshellarg(\$url['user'] ?? '') . PHP_EOL;
        echo 'export DB_PASSWORD=' . escapeshellarg(\$url['pass'] ?? '') . PHP_EOL;
    ")
    echo "[start.sh] Conexión pública → host=${DB_HOST} port=${DB_PORT} db=${DB_DATABASE}"
fi

echo "[start.sh] DB_HOST='${DB_HOST}'"
echo "[start.sh] DB_PORT='${DB_PORT}'"
echo "[start.sh] DB_DATABASE='${DB_DATABASE}'"

if [[ -z "$DB_HOST" || "$DB_HOST" == *"={{"* || "$DB_HOST" == "port="* ]]; then
    echo "[start.sh] ERROR: DB_HOST está vacío o no fue resuelto: '${DB_HOST}'"
    exit 1
fi

if [[ "$DB_HOST" == *"-pooler"* ]]; then
    export DB_HOST="${DB_HOST/-pooler/}"
    echo "[start.sh] Pooler detectado → usando conexión directa: $DB_HOST"
fi

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
        echo "[start.sh] ERROR: DB no respondió después de $MAX_RETRIES intentos. Abortando."
        exit 1
    fi
    echo "[start.sh] Intento $attempt/$MAX_RETRIES fallido. Reintentando en ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    attempt=$((attempt + 1))
    RETRY_DELAY=$((RETRY_DELAY * 2))
done

echo "[start.sh] Conexión a la base de datos establecida."

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
}
"

# Migraciones obligatorias — si fallan, el schema no está listo y no tiene sentido arrancar
php artisan migrate --force

# Seed no-fatal: si ya hay datos o falla por otro motivo, Apache igual arranca
php artisan db:seed --force || echo "[start.sh] ADVERTENCIA: seed falló, continuando..."

exec apache2-foreground
