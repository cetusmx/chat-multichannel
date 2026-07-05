FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY prisma/ ./prisma/
COPY src/ ./src/

EXPOSE 4000

CMD ["node", "src/index.js"]
