# Dockerfile for gleif/tsx image
FROM node:24-alpine3.20

# install bash and curl
RUN apk add --no-cache \
    bash \
    curl

WORKDIR /vlei

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
RUN npm install

COPY src ./src

RUN npm install -g tsx

CMD ["tsx"]

