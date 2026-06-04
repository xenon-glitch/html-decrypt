FROM node:20-slim

# Install Chromium and its dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && apt-get clean

# Set the environment variable so Puppeteer knows where to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy the rest of your application code
COPY . .

# Expose the port your app listens on (change if necessary)
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "bot.js" ]