# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first — better layer caching
COPY package*.json ./
RUN npm ci

# VITE_ variables are inlined at build time by Vite.
# Pass your API URL via --build-arg or docker-compose build args.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

