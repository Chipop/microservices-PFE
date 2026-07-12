FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
ARG VITE_GATEWAY_URL=http://localhost:8080
ARG VITE_USE_MOCKS=false
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 9000
