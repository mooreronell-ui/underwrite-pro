FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Set environment variables
ENV PORT=10000
ENV NODE_ENV=production

# Expose port
EXPOSE 10000

# Start the application
CMD ["npm", "start"]
