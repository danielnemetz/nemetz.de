# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile --prod

# Copy built files (already built locally)
COPY dist-server ./dist-server
COPY dist ./dist

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

ARG BUILD_ID=local-dev
ENV BUILD_ID=${BUILD_ID}

CMD ["node", "dist-server/server/server.js"]

