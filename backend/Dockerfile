# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src

# Build
RUN npm run build
RUN npm run prisma:generate

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (prisma is needed for client generation)
RUN npm ci

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Generate Prisma client
RUN npm run prisma:generate

EXPOSE 3000

CMD ["npm", "start"]
