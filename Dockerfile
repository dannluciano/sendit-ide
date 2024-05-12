FROM node:20.12.0

USER root

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app

ARG PORT=8001
ENV PORT $PORT
EXPOSE $PORT

COPY package.json .
COPY package-lock.json .
RUN npm ci --silent --include dev

COPY --chown=root:root . .

RUN mkdir -p /var/storages/sendit-ide/

RUN npm run seeds

# ENTRYPOINT [ "scripts/entrypoint.sh" ]

CMD [ "npm", "start" ]
