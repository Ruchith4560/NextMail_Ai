# ==========================================
# Stage 1: Build stage with Node 20 Alpine
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Alpine server
# ==========================================
FROM nginx:1.27-alpine AS runner

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
