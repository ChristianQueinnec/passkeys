FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# The build does not need a real JWT_SECRET — the value is only used at
# runtime when a request is handled.  Using a placeholder here avoids baking
# a known secret into an image layer that is visible via `docker history`.
RUN export JWT_SECRET=not-used-at-build-time ; \
    export NODE_ENV=production ; \
    npm run build
#RUN npm prune --omit=dev
RUN export JWT_SECRET=not-used-at-build-time ; \
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
COPY --from=builder /app/passkeys.tag /app/passkeys.id ./

# JWT_SECRET is generated at container startup in docker-entrypoint.sh,
# not here — writing it in a RUN layer would bake it into the image.
# Create data directory for volume mount
RUN mkdir -p data && \
    chown -R ${UID}:${GID} data

# Switch to the new user for subsequent commands
USER ${USER}

ENV NODE_ENV=production
EXPOSE 3000

COPY docker-entrypoint.sh /app/

CMD ["/app/docker-entrypoint.sh"]
