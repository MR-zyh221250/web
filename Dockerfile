ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:stable-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build && mkdir /app/crm-dist && cp -r dist/assets /app/crm-dist/ && cp dist/manage.html /app/crm-dist/index.html && cp dist/project-notes.txt /app/crm-dist/ && rm dist/manage.html

FROM ${NGINX_IMAGE} AS base
COPY docker/nginx.conf /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]

FROM base AS crm
COPY --from=build --chown=nginx:nginx /app/crm-dist/ /usr/share/nginx/html/

FROM base AS runtime
COPY --from=build --chown=nginx:nginx /app/dist/ /usr/share/nginx/html/
