# ============================================================
# DOCKERFILE - UNDERWRITE PRO BACKEND
# Node.js Express API with PostgreSQL
# ============================================================

FROM node:22-alpine

# Install Python and ML dependencies
RUN apk add --no-cache python3 py3-pip && \
    python3 -m pip install --break-system-packages xgboost scikit-learn numpy pandas

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "index.js"]
