FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./

RUN bun install

COPY . .

CMD ["bun", "server.ts"]

EXPOSE 3000