FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Create a directory for the persistent SQLite database
RUN mkdir -p data

EXPOSE 3000

CMD ["npm", "start"]