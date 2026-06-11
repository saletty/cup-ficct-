FROM php:8.2-apache

# Dependencias de sistema + extensiones PHP para Laravel + PostgreSQL + GD (requerido por PhpSpreadsheet)
RUN apt-get update && apt-get install -y \
    libpq-dev libzip-dev zip unzip curl git \
    libpng-dev libjpeg-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql zip bcmath gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Habilitar mod_rewrite y mod_headers; desactivar MPMs extra para evitar conflicto
RUN a2dismod mpm_event mpm_worker 2>/dev/null; \
    a2enmod mpm_prefork rewrite headers

# Reemplazar el VirtualHost por defecto con config limpia:
# - DocumentRoot apunta a public/
# - CORS headers en todas las respuestas (belt-and-suspenders junto a Laravel CORS)
# - AllowOverride All para que .htaccess funcione
COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
