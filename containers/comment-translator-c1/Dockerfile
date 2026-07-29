FROM node:22.22.2-bookworm-slim

WORKDIR /app
COPY container-entrypoint.mjs parent.mjs child.mjs /app/
USER node
ENTRYPOINT ["node", "/app/container-entrypoint.mjs"]
