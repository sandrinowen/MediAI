#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"

sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:.*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

php artisan config:clear --no-interaction
php artisan view:clear --no-interaction
php artisan migrate --force --no-interaction
php artisan config:cache --no-interaction
php artisan view:cache --no-interaction

exec "$@"
