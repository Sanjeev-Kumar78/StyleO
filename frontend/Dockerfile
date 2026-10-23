# Build stage
FROM node:26.12.1-alpine
RUN apk upgrade --no-cache
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_BACKEND_URL=http://localhost:8080
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build
EXPOSE 4173
CMD ["npm","run","preview","--","--host","0.0.0.0","--port","4173"]