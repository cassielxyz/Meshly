FROM node:22-alpine

WORKDIR /app
COPY workers/terabox/worker.mjs ./worker.mjs

ENV NODE_ENV=production \
    PORT=8080 \
    TERABOX_WORKER_TEMP_DIR=/tmp/meshly-terabox

EXPOSE 8080
USER node

CMD ["node", "worker.mjs"]
