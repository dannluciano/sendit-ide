FROM node:lts AS development

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app

# default to port 8000 for node
ARG PORT=8000
ENV PORT $PORT
EXPOSE $PORT

COPY package.json .
COPY package-lock.json .
RUN npm ci

# copy in our source code last, as it changes the most
COPY . .

CMD [ "node", "server.js" ]