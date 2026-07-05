# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app
# Copy frontend package files
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
# Add a build argument or env var for VITE_API_URL if needed, but since it's same origin, it can default to /api
RUN npm run build

# Stage 2: Build Backend & App
FROM node:20-alpine
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY backend/prisma/ ./prisma/
RUN npx prisma generate

# Copy backend source
COPY backend/src/ ./src/

# Create public directory and copy built frontend
RUN mkdir -p public
COPY --from=builder /app/frontend/dist/ ./public/

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads public src

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER node

# Start the server
CMD ["node", "src/index.js"]
