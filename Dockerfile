# Stage 1: Build Frontend
FROM node:alpine AS ui-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Runtime
FROM node:alpine
RUN apk add --no-cache mktorrent

WORKDIR /app

# Setup Backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy Backend Code
COPY backend/ .

# Copy Built Frontend to Public
COPY --from=ui-build /app/frontend/dist /app/public

# Environment Variables
ENV DATA_DIR=/data
ENV OUTPUT_DIR=/output
ENV PORT=3000

# Expose Port
EXPOSE 3000

# Start Server
CMD ["node", "server.js"]
