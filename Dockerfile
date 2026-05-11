FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create non-root user for better security
RUN addgroup -g 1000 -S nodejs && \
    adduser -S nextjs -u 1000

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5000

CMD ["node", "src/server.js"]
