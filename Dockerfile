FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN export JWT_SECRET=building ; \
    export NODE_ENV=production ; \
    npm run build
#RUN npm prune --omit=dev
RUN export JWT_SECRET=building ; \
    export NODE_ENV=production ; \
    npm ci --omit=dev

FROM node:24-bullseye AS runner

ARG UID=1001
ARG GID=1001
ARG USER=admin

# Create a group and user with the specified GID and UID
RUN groupadd -g ${UID} ${USER} && \
    useradd -m -u ${UID} -g ${GID} -s /bin/bash ${USER}

WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package.json .

RUN echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# Create data directory for volume mount
RUN mkdir -p data && \
    chown -R ${UID}:${GID} data

# Switch to the new user for subsequent commands
USER ${USER}

ENV NODE_ENV=production
EXPOSE 3000

COPY docker-entrypoint.sh /app/

CMD ["/app/docker-entrypoint.sh"]
