FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src
COPY scripts ./scripts

USER node
EXPOSE 3000
CMD ["node", "src/server.mjs"]
