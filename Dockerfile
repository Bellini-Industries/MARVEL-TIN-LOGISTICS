# Multi-stage production build for MARVEL TIN Fleet Management on Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json ./
# Install all dependencies needed for build (including devDependencies like vite, typescript, tailwindcss)
RUN npm install

# Copy application source code
COPY . .

# Build the Vite SPA production bundle (outputs to /app/dist)
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only + tsx to execute server.ts
COPY package.json ./
RUN npm install --omit=dev && npm install -g tsx

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code and configs
COPY server.ts ./
COPY firebase-applet-config.json ./
COPY tsconfig.json ./

# Healthcheck for Cloud Run / Kubernetes
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

EXPOSE 8080

# Cloud Run injects PORT environment variable automatically
CMD ["tsx", "server.ts"]
