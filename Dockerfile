FROM node:20-slim

# Install Chromium and its dependencies (required for Puppeteer)
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && apt-get clean

# Tell Puppeteer where to find the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install dependencies – using npm install (works with or without lockfile)
RUN npm install

# Copy the rest of your application source code
COPY . .

# Expose the port your bot listens on (Telegram bots usually don't need a port, but it's safe to keep)
EXPOSE 3000

# Start your bot
CMD [ "node", "bot.js" ]
