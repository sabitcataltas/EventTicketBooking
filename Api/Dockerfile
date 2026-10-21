FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY Api/package.json Api/
COPY Web/package.json Web/
COPY MockPaymentService/package.json MockPaymentService/

FROM base AS web
RUN npm ci -w web --include-workspace-root
COPY Web Web
ARG VITE_API_URL=/api
ARG VITE_OIDC_AUTHORITY=http://localhost:8180/realms/event-ticket-booking
ARG VITE_OIDC_CLIENT_ID=event-ticket-booking-app
ARG VITE_OIDC_REDIRECT_URI=http://localhost:3000
RUN npm run build -w web

FROM base
RUN npm ci -w api && npm cache clean --force
COPY Api/tsconfig.json Api/
COPY Api/src Api/src
COPY --from=web /app/Web/dist Web/dist
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/Web/dist
WORKDIR /app/Api
EXPOSE 3000
CMD ["node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
