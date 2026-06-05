#!/bin/sh
set -e

export DCC_API_PORT="${DCC_API_PORT:-3003}"

if [ "$NGINX_TLS" = "true" ]; then
  export NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-hat3d.com}"
  export NGINX_SSL_CERT="${NGINX_SSL_CERT:-/etc/letsencrypt/live/hat3d.com/fullchain.pem}"
  export NGINX_SSL_KEY="${NGINX_SSL_KEY:-/etc/letsencrypt/live/hat3d.com/privkey.pem}"
  envsubst '${DCC_API_PORT} ${NGINX_SERVER_NAME} ${NGINX_SSL_CERT} ${NGINX_SSL_KEY}' \
    < /etc/nginx/https.conf.template > /etc/nginx/conf.d/default.conf
else
  envsubst '${DCC_API_PORT}' \
    < /etc/nginx/http.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
