FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

FROM node:24-bullseye AS runner

# Create a group and user with the specified GID and UID
RUN groupadd -g 1299 queinnec && \
    useradd -m -u 1299 -g 1299 -s /bin/bash queinnec

WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package*.json .

# Create data directory for volume mount
RUN mkdir -p data && \
    chown -R queinnec:queinnec data

# Switch to the new user for subsequent commands
USER queinnec

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build"]
