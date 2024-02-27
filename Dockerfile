FROM node:lts

USER root

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app

EXPOSE $PORT

# copy in our source code last, as it changes the most
COPY --chown=root:root index.html .
COPY --chown=root:root assets ./assets

CMD [ "npx", "http-server"]


