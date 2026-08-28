FROM node:18-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install better-sqlite3 --build-from-source

COPY . .

RUN mkdir -p data

EXPOSE 3000
CMD ["node", "server.js"]