FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# Build args
ARG NUXT_PUBLIC_JSON_URL
ARG GOOGLE_CLIENT_ID
ENV NUXT_PUBLIC_JSON_URL=$NUXT_PUBLIC_JSON_URL
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID

# Build as static site
RUN pnpm run generate

FROM nginx:alpine AS runner

COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
