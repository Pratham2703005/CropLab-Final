FROM node:20-alpine AS builder

WORKDIR /app

# Install deps from the lockfile for reproducible builds
COPY package*.json ./
RUN npm ci

COPY . .

# `npm run build` also runs vitest + tsc -b; in the image we only need the build.
# Vite loads VITE_* vars from the copied .env at build time.
RUN npx vite build

FROM nginx:alpine

# SPA routing fallback (replaces vercel.json rewrites)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
