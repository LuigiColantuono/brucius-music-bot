# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lock (if it exists)
COPY package.json bun.lock* ./

# Set dummy DATABASE_URL for Prisma 7 generation (required by prisma.config.ts)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Copy Prisma schema before install for postinstall scripts
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy the rest of the application
COPY . .

# Expose the ports (3000: bot, 3001: legacy api, 3003: current api)

# Expose the ports (3000: bot, 3001: legacy api, 3003: current api)
EXPOSE 3000
EXPOSE 3001
EXPOSE 3003

# Run the application directly from TS
CMD ["bun", "run", "start"]
