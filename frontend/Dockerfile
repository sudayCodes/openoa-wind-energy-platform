# --- Build stage ---
FROM node:20-alpine AS build

WORKDIR /app
COPY openoa-app/frontend/package.json openoa-app/frontend/package-lock.json ./
RUN npm ci
COPY openoa-app/frontend/ .
RUN npm run build

# --- Production stage ---
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY openoa-app/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
