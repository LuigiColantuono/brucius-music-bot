# 𝗕 𝗥 𝗨 𝗖 𝗜 𝗨 𝗦 🎵

<p align="center">
<img width="150" alt="Brucius" src="https://avatars.githubusercontent.com/u/163913397?v=4" />
</p>

<p align="center">
  <strong>Enterprise Discord Music Bot powered by Bun, TypeScript 7, Lavalink v4 & Discord.js</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.4%2B-black?style=flat&logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-blue?style=flat&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Discord.js-v14.27-5865F2?style=flat&logo=discord" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Prisma-7.9-2D3748?style=flat&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-green.svg" alt="AGPL-3.0 License" />
</p>

---

## Overview & Philosophy

**Brucius** è un bot musicale per Discord moderno, ad alte prestazioni e di livello aziendale, costruito da zero per sfruttare appieno la velocità del runtime **Bun** e di **TypeScript 7**.
È progettato per funzionare **senza bisogno di configurazioni** con **SoundCloud**, **Bandcamp**, **Twitch**, **Radio Streaming**, flussi audio HTTP/HTTPS diretti e formati audio supportati nativamente da Lavalink v4.
There is currently no support for YouTube as it requires a lot of workarounds to play.

---

## Key Features

- **Bun Runtime & TypeScript 7:** Sub-millisecond startup, native `.env` loading, and lightning-fast I/O.
- **Dynamic Player UI & Canvas V2:** Real-time track thumbnail generation using `@napi-rs/canvas` along with interactive Discord UI components (buttons, modals, select menus).
- **Cross-Hosting & Hybrid Sharding Grid:** Scalable multi-process and multi-server architecture with `buncord-cross-hosting` and `buncord-hybrid-sharding`.
- **PostgreSQL Database + Prisma 7:** Persistent queues, playlists, favorites, guild settings, and play history.
- **Optional Redis Cache:** High-throughput caching for player states and frequent interactions.
- **Built-in REST & WebSocket API Bridge:** Lightweight internal API server powered by `Bun.serve()` for dashboards and real-time monitoring.
- **Internationalization (i18n):** Native multi-language support (English & Italian).
- **Native Test Suite:** Instant unit testing powered by `bun test`.

---

## Prerequisites

- **[Bun](https://bun.sh/)** `>= 1.4.0`
- **Lavalink v4 Node** (included in Docker Compose)
- **PostgreSQL Database** `>= 14` (included in Docker Compose)
- _(Optional)_ **Redis** `>= 6`

## Quick Start (Local Setup)

### 1. Clone the Repository

```bash
git clone https://github.com/LuigiColantuono/brucius-music.git
cd brucius-music
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Copy the template `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Discord Bot credentials and connection URLs:

```env
# Discord Bot Token (from Discord Developer Portal)
DISCORD_TOKEN=your_discord_bot_token_here

# Lavalink v4 Node Configuration
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# PostgreSQL Database Connection URL (Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"

# Redis Cache (Optional)
REDIS_URL="redis://localhost:6379"

# Bot Internal API & Dashboard Bridge Port (Default: 3003)
MUSIC_BOT_API_PORT=3003
```

### 4. Run Database Migrations

```bash
bun run prisma:generate
bun run prisma:deploy
```

### 5. Start the Bot

- **Development Mode (with watch & auto-reload):**
    ```bash
    bun run dev
    ```
- **Production Mode (Grid Launcher):**
    ```bash
    bun run start
    ```

---

## Deployment with Docker & Docker Compose

The repository includes a production-ready Docker Compose configuration that spins up the entire stack (Bot, Lavalink v4, PostgreSQL, and Redis) in a single command:

```bash
# Start the full stack in background
docker compose up -d

# View logs in real time
docker compose logs -f bot

# Stop the stack
docker compose down
```

---

## Deployment Guides (Dokploy / Coolify / VPS)

### Dokploy / Coolify (Docker Compose)

1. Create a new **Project** or **Stack** in your dashboard.
2. Connect your GitHub repository or paste the contents of `docker-compose.yml`.
3. In the **Environment Variables** section, set the variables defined in `.env.example`.
4. Trigger the deployment.

### PM2 Process Manager (VPS without Docker)

The project includes a pre-configured [ecosystem.config.cjs](file:///c:/tmp/brucius-music/ecosystem.config.cjs):

```bash
# Start all processes managed by PM2 via Bun
pm2 start ecosystem.config.cjs

# Monitoring & Logs
pm2 monit
pm2 logs
```

---

## Available Scripts

| Script           | Command                  | Description                                                   |
| ---------------- | ------------------------ | ------------------------------------------------------------- |
| `start`          | `bun run start`          | Launches the complete production grid (Bridge + ShardManager) |
| `dev`            | `bun run dev`            | Runs the launcher in development watch mode                   |
| `test`           | `bun test`               | Executes unit test suites with Bun Test                       |
| `lint`           | `bun run lint`           | Performs static code analysis using Biome                     |
| `format`         | `bun run format`         | Formats all source files using Biome                          |
| `prisma:migrate` | `bun run prisma:migrate` | Applies schema migrations in development                      |
| `prisma:deploy`  | `bun run prisma:deploy`  | Applies pending migrations to the production database         |
| `prisma:studio`  | `bun run prisma:studio`  | Opens the visual database management GUI                      |
| `docker:up`      | `bun run docker:up`      | Starts all Docker containers in background                    |
| `docker:down`    | `bun run docker:down`    | Stops and tears down Docker containers                        |

---

## Author

- **Luigi Colantuono** - [GitHub](https://github.com/LuigiColantuono)

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  
See the [LICENSE](LICENSE) file for details.

---

## Discord Commands & Preview

The bot was designed to eliminate the need for commands, allowing users to simply interact with the bot's buttons.
It also uses exclusively the new V2 components.

- **`/Setup:`** Launches the setup program for configuring the bot, which can only be installed on a forum channel. You can also select the language and skin.
- **`/Status:`** View the bot's status and general information.
- **`/Reload:`** Reloads the bot's interface if any problems are encountered to avoid having to re-run the setup.

<p align="center">
<img src="https://media.discordapp.net/attachments/1457678238296965308/1457678299072303267/Screenshot_2025-12-27_222608.png?ex=6a8e1374&is=6a8cc1f4&hm=9e7d5a08e12cd28fa23f8f4a294f50a3db6287fc5fdeac293ee3078e83f6c01f&=&format=webp&quality=lossless" />
</p>
<p align="center">
<img src="https://media.discordapp.net/attachments/1457678238296965308/1457678299403649165/Screenshot_2025-12-27_222625.png?ex=6a8e1374&is=6a8cc1f4&hm=c124b450f372bc9f18205acdc9d417dd94f4a208b5539088c5a42a5358d53c69&=&format=webp&quality=lossless" />
</p>
<p align="center">
<img src="https://media.discordapp.net/attachments/1457678238296965308/1457678299684933774/Screenshot_2025-12-27_223406.png?ex=6a8e1374&is=6a8cc1f4&hm=a8e1da12b35f86c09060458cc33dc8068ce440e7dd06954904854109110de3b4&=&format=webp&quality=lossless" />
</p>

---
