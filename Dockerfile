# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install

COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy only the build artifacts from Stage 1
COPY --from=builder /app/build ./build

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Start the server with proper SPA routing (all routes go to index.html)
CMD ["serve", "-s", "build", "-l", "3000", "--no-clipboard"]