FROM php:8.2-apache

# Dependencias de sistema + extensiones PHP para Laravel + PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev libzip-dev zip unzip curl git \
    && docker-php-ext-install pdo pdo_pgsql zip bcmath \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Habilitar mod_rewrite para las rutas de Laravel
RUN a2enmod rewrite

# Apuntar DocumentRoot al public/ de Laravel y habilitar AllowOverride
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
 && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

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
