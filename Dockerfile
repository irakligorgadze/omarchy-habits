FROM node:18-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --build-from-source=better-sqlite3

COPY . .

RUN mkdir -p data

EXPOSE 3000
CMD ["node", "server.js"]