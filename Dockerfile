# Node.js 24 Alpine LTS base
FROM node:24-alpine AS base

# Install dumb-init for proper signal forwarding and PID 1 reaper
RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/

# Run as non-root unprivileged user for defense-in-depth container security
USER node

# Expose HTTP port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Use dumb-init to handle SIGINT/SIGTERM gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
