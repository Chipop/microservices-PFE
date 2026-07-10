FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
ARG VITE_GATEWAY_URL=http://localhost:8080
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV CHOKIDAR_USEPOLLING=true
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/spa /usr/share/nginx/html

EXPOSE 9000
