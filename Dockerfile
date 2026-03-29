# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_BACKEND_URL=http://localhost:3001
ARG VITE_GA_TRACKING_ID=
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ssl_params.conf /etc/nginx/conf.d/ssl_params.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]