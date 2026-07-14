# --- build stage: install all deps and compile TypeScript -> dist ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# install (not `npm ci`) because the lockfile predates the new runtime deps
RUN npm install
COPY . .
RUN npm run build

# --- runtime stage: prod deps only + compiled output ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/main"]
