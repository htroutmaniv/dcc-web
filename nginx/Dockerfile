FROM nginx:alpine
RUN apk add --no-cache gettext
COPY nginx/00-upgrade-map.conf /etc/nginx/conf.d/00-upgrade-map.conf
COPY nginx/http.conf.template /etc/nginx/http.conf.template
COPY nginx/https.conf.template /etc/nginx/https.conf.template
COPY nginx/entrypoint.sh /entrypoint.sh
# Strip Windows CRLF so Linux can exec the script
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
