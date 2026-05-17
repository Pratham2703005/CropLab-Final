FROM node:20-alpine AS builder

WORKDIR /app

# Install deps from the lockfile for reproducible builds.
# --ignore-scripts skips the package.json `prepare` script (lint + type-check),
# which would otherwise run — and fail — during install.
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# `npm run build` also runs vitest + tsc -b; in the image we only need the build.
# Vite loads VITE_* vars from the copied .env at build time.
RUN npx vite build

# --- Dev stage: Vite dev server with hot-reload (used by docker-compose.override.yml) ---
# Source and node_modules are supplied at runtime via volume mounts.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--port", "5173"]

# --- Prod stage: static build served by nginx (default build target) ---
FROM nginx:alpine AS prod

# SPA routing fallback (replaces vercel.json rewrites)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
