# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]