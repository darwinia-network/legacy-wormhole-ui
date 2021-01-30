FROM node:12 as builder
WORKDIR /app

ARG BUILD_COMMAND

COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn run ${BUILD_COMMAND}

FROM nginx:mainline-alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY ./nginx-http.conf /etc/nginx/conf.d/default.conf
