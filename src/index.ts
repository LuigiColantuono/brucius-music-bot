// src/index.ts - VERSIONE CORRETTA
// Bun carica automaticamente .env, non serve dotenv

// 1. Aggiungi 'Events' qui
import { Events } from "discord.js";
import { commands } from "./commands/index.ts";
import { PlayerUI } from "./components/PlayerUI.ts";
import { BruciusBot } from "./core/Bot.ts";
import { logger } from "./monitoring/Logger.ts";
import { errorHandler } from "./utils/ErrorHandler.ts";

async function start() {
    try {
        console.log("🎵 Avvio 𝗕 𝗥 𝗨 𝗖 𝗜 𝗨 𝗦...");

        const bot = new BruciusBot();
        errorHandler.initialize(bot);
        PlayerUI.initialize(bot);

        // MODIFICA QUI: Usa .once() e Events.ClientReady
        bot.once(Events.ClientReady, async () => {
            try {
                console.log(
                    `✅ Bot ready as ${bot.user?.tag} (Index Listener)`,
                );

                // Registra comandi slash
                if (bot.application) {
                    const commandData = commands.map((cmd) =>
                        cmd.data.toJSON(),
                    );
                    await bot.application.commands.set(commandData);
                    console.log(
                        `✅ ${commandData.length} comandi slash registrati`,
                    );

                    // Test: stampa comandi registrati
                    const registeredCommands =
                        await bot.application.commands.fetch();
                    console.log(
                        `📋 Comandi registrati: ${registeredCommands.size}`,
                    );
                    registeredCommands.forEach((cmd) => {
                        console.log(`  • /${cmd.name} - ${cmd.description}`);
                    });
                } else {
                    console.log("⚠️ Application non disponibile");
                }

                // Controlla connessione audio dopo 3 secondi
                setTimeout(() => {
                    if (bot.audio.isAudioConnected()) {
                        console.log("🎵✅ Audio manager CONNESSO a Lavalink!");
                    } else {
                        // Nota: Questo log potrebbe apparire anche se sta funzionando,
                        // dato che l'audio si connette in asincrono nel Bot.ts.
                        // Usalo solo per debug se qualcosa non va.
                        /* 
                        const nodes = bot.audio.shoukaku.nodes;
                        console.log('🔍 Stato nodes:', { ... });
                        */
                    }
                }, 3000);
            } catch (error) {
                console.error("❌ Errore in ready handler:", error);
            }
        });

        // Importa e setup event handler
        const { execute } = await import("./events/interactionCreate.js");
        // Opzionale: Anche qui puoi usare Events.InteractionCreate se vuoi essere precisissimo,
        // ma 'interactionCreate' non è deprecato come 'ready', quindi va bene anche così.
        bot.on("interactionCreate", execute);

        // Connetti il database PRIMA del login
        await bot.database.connect();

        // Carica i thread persistenti del player
        await PlayerUI.loadPersistentThreads();

        // Avvia il bot
        await bot.login(process.env.DISCORD_TOKEN!);

        // Avvia Server API per Dashboard (Porta configurabile, default 3003 per matchare Dashboard)
        const apiPort = parseInt(process.env.MUSIC_BOT_API_PORT || "3003", 10);
        errorHandler.startDashboardServer(apiPort);

        console.log("✅ Bot avviato!");
    } catch (error) {
        console.error("❌ Errore avvio:", error);
        process.exit(1);
    }
}

// Gestione shutdown
process.on("SIGINT", async () => {
    console.log("\n🛑 Arresto bot...");
    await logger.cleanup();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("\n🔚 Terminazione richiesta...");
    await logger.cleanup();
    process.exit(0);
});

start();
