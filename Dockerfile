FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

# Create data directory for volume mount
RUN mkdir -p data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build"]
