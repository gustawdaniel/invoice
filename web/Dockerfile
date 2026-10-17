FROM node:22-alpine AS builder
WORKDIR /app
# the pnpm of packageManager in package.json
RUN npm install -g pnpm@11.13.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL=https://api.openinvoice.in
ARG VITE_GOOGLE_CLIENT_ID=244384199602-sqhor9mc08tkl3gkd71k9c46rq38msdd.apps.googleusercontent.com
ENV VITE_API_URL=$VITE_API_URL VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN pnpm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/build /srv
EXPOSE 80
