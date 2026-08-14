# ============================================================
# Dockerfile — Carbon Node.js Backend Proxy
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3002

ENV PORT=3002
ENV NODE_ENV=production

# Run Express server
CMD ["node", "server.js"]
