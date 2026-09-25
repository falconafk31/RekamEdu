# ---- Tahap builder: install dependensi, generate Prisma client, build NestJS ----
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma membutuhkan openssl di Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Tahap runner: image ramping hanya berisi hasil build ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Skema Prisma disertakan agar migrasi/seed bisa dijalankan dari container bila perlu.
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
