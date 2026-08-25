import type { Server } from "bun";
import type { Client } from "discord.js";
import { handleBotApiRequest } from "../api/BotApiBridge.ts";
import { logger } from "../monitoring/Logger.ts";
import Ui from "./Ui.ts";

export class GlobalErrorHandler {
    private static instance: GlobalErrorHandler;
    private client: Client | null = null;
    private server: Server<any> | null = null;
    // private redis: RedisClient; // 🔥 REDIS Managed by Logger

    // Configurazione stile box nativo
    private boxOptions = {
        padding: 1,
        margin: 1,
        borderStyle: "single" as const,
        borderColor: "#4DFFFF",
    };

    // ✅ Riferimenti ai metodi console originali (PRIMA dell'override)
    private originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
    };

    private constructor() {}

    public static getInstance(): GlobalErrorHandler {
        if (!GlobalErrorHandler.instance) {
            GlobalErrorHandler.instance = new GlobalErrorHandler();
        }
        return GlobalErrorHandler.instance;
    }

    private formatLogLine(message: string, prefix: string = ""): string {
        const timestamp = Ui.gray(
            `[${new Date().toLocaleTimeString("it-IT")}]`,
        );
        return `${timestamp} ${prefix}${message}`;
    }

    public initialize(client: Client): void {
        this.client = client;

        // Mostra banner iniziale
        this.showWelcomeBanner();

        process.on("unhandledRejection", (reason, promise) => {
            this.handleUnhandledRejection(reason, promise);
        });

        process.on("uncaughtException", (error) => {
            this.handleUncaughtException(error);
        });

        process.on("uncaughtExceptionMonitor", (error) => {
            this.handleUncaughtExceptionMonitor(error);
        });

        client.on("error", (error) => {
            this.handleDiscordError(error);
        });

        client.on("warn", (warning) => {
            this.handleDiscordWarn(warning);
        });

        this.interceptConsole();
        this.logSuccess("Global Error Handler inizializzato");
    }

    // 🔥 METODO AGGIUNTO: Avvia Server Dashboard (Bun Native)
    public startDashboardServer(port: number = 3003): void {
        const hostname = "0.0.0.0";

        try {
            this.server = Bun.serve({
                port: port,
                hostname: hostname,
                fetch: async (req: Request, server: any) => {
                    const url = new URL(req.url);

                    // Log di base per ogni richiesta (aiuta il debug)
                    console.log(
                        `🌐 [API Server] ${req.method} ${url.pathname} from ${req.headers.get("host")}`,
                    );

                    if (url.pathname === "/ws") {
                        if (server.upgrade(req)) {
                            return undefined;
                        }
                        return new Response("WebSocket upgrade failed", {
                            status: 400,
                        });
                    }

                    if (
                        url.pathname.startsWith("/api/bot/") ||
                        url.pathname.startsWith("/api/lavalink/")
                    ) {
                        return handleBotApiRequest(req, this.client);
                    }

                    return new Response(
                        `Brucius Music Bot API Server Online 🚀\nPort: ${port}\nTime: ${new Date().toISOString()}`,
                    );
                },
                websocket: {
                    open(ws: any) {
                        ws.subscribe("dashboard");
                        console.log("📶 [WS] Dashboard connected");
                    },
                    message(_ws: any, _message: any) {},
                    close(_ws: any, _code: number, _message: string) {
                        console.log("📶 [WS] Dashboard disconnected");
                    },
                },
            });

            console.log(
                `🚀 [API] Server listening on http://${hostname}:${port}`,
            );
            this.logSuccess(`Dashboard Server avviato su porta ${port}`);
        } catch (error: any) {
            console.error(
                `❌ [API] Failed to start server on port ${port}:`,
                error.message,
            );
        }
    }

    // 🔥 METODO AGGIORNATO: Invia log al logger di sistema
    private broadcastLog(
        level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "SYSTEM" | "SUCCESS",
        module: string,
        message: string,
    ): void {
        const logMsg = `[${module}] ${message}`;

        // Logga internamente
        switch (level) {
            case "ERROR":
                logger.error(logMsg);
                break;
            case "WARN":
                logger.warn(logMsg);
                break;
            case "INFO":
            case "SYSTEM":
            case "SUCCESS":
                logger.info(logMsg);
                break;
            case "DEBUG":
                logger.debug(logMsg);
                break;
        }

        // 1. Broadcast Realtime per Dashboard (WebSocket)
        if (this.server) {
            const feLevel = level === "SUCCESS" ? "SYSTEM" : level;
            const payload = JSON.stringify({
                type: "log",
                level: feLevel,
                module: module,
                message: message,
                timestamp: new Date().toISOString(),
            });
            this.server.publish("dashboard", payload);
        }
    }

    // ✅ Metodo helper per aggiungere timestamp e livellare ogni riga (Enterprise V2 Style)
    private formatMultiLineBox(boxContent: string): string {
        const timestamp = Ui.gray(
            `[${new Date().toLocaleTimeString("it-IT")}]`,
        );
        const lines = boxContent.split("\n");

        return lines
            .map((line, index) => {
                if (index === 0) {
                    return `${timestamp} ${line}`;
                } else {
                    return " ".repeat(11) + line;
                }
            })
            .join("\n");
    }

    private showWelcomeBanner(): void {
        const botName = this.client?.user?.username || "Bot";
        const welcomeText =
            Ui.hex("#FF6BFF")(`✨ ${botName}`) +
            Ui.hex("#4DFFFF")(" Error Handler");
        const box = Ui.drawBox(welcomeText, {
            ...this.boxOptions,
            borderColor: "#FF6BFF",
            title: "SISTEMA AVVIATO",
            titleAlignment: "center",
        });

        // Usa console.log originale per il banner (che è l'unico box ammesso al boot)
        this.originalConsole.log(box);

        logger.info(`SISTEMA AVVIATO: Bot ${botName} online`);
        this.broadcastLog(
            "SYSTEM",
            "Boot",
            `Bot ${botName} avviato correttamente`,
        );
    }

    private handleUnhandledRejection(
        reason: any,
        _promise: Promise<any>,
    ): void {
        const errorBox = Ui.drawBox(
            Ui.red("❌ UNHANDLED REJECTION\n\n") +
                Ui.yellow("Reason: ") +
                Ui.white(reason?.message || reason) +
                "\n\n" +
                Ui.yellow("Stack: ") +
                Ui.gray(reason?.stack || "N/A"),
            {
                ...this.boxOptions,
                borderColor: "#FF0000",
                title: "ERRORE CRITICO",
                titleAlignment: "center",
            },
        );
        logger.error("UNHANDLED REJECTION", reason);
        this.originalConsole.error(this.formatMultiLineBox(errorBox));

        // 🔥 AGGIUNTO: Invia anche al WebSocket
        this.broadcastLog(
            "ERROR",
            "UnhandledRejection",
            reason?.message || String(reason),
        );
    }

    private handleUncaughtException(error: Error): void {
        const crashBox = Ui.drawBox(
            Ui.red("💥 UNCAUGHT EXCEPTION\n\n") +
                Ui.yellow("Error: ") +
                Ui.white(error.message) +
                "\n" +
                Ui.yellow("Stack: ") +
                Ui.gray(error.stack || "N/A"),
            {
                ...this.boxOptions,
                borderColor: "#FF0000",
                title: "CRASH IMMINENTE",
                titleAlignment: "center",
            },
        );
        logger.error("UNCAUGHT EXCEPTION", error);
        this.originalConsole.error(this.formatMultiLineBox(crashBox));

        // 🔥 AGGIUNTO: Invia anche al WebSocket
        this.broadcastLog("ERROR", "UncaughtException", error.message);

        setTimeout(() => {
            const restartBox = Ui.drawBox(
                Ui.yellow("🔄 Riavvio forzato in corso..."),
                {
                    padding: 1,
                    borderStyle: "single" as const,
                    borderColor: "#FFD93D",
                },
            );
            this.originalConsole.log(this.formatMultiLineBox(restartBox));

            // 🔥 AGGIUNTO: Invia anche al WebSocket
            this.broadcastLog("WARN", "System", "Riavvio forzato in corso...");

            process.exit(1);
        }, 3000);
    }

    private handleUncaughtExceptionMonitor(error: Error): void {
        // ✅ Questo usa il console.error normale (con timestamp automatico)
        // NOTA: Se interceptConsole è attivo, questo potrebbe duplicare.
        // Ma handleUncaughtExceptionMonitor è spesso spammy, meglio lasciarlo gestire al console catch.
        console.error(
            Ui.hex("#FFA500")("🔍 MONITOR: ") + Ui.white(error.message),
        );

        // Send explicit Structured log
        this.broadcastLog("WARN", "ExceptionMonitor", error.message);
    }

    private handleDiscordError(error: any): void {
        const discordBox = Ui.drawBox(
            Ui.hex("#FF6B6B")("🔴 DISCORD.JS ERROR\n\n") +
                Ui.yellow("Code: ") +
                Ui.white(error.code || "N/A") +
                "\n" +
                Ui.yellow("Message: ") +
                Ui.white(error.message) +
                "\n" +
                Ui.yellow("Stack: ") +
                Ui.gray(error.stack || "N/A"),
            {
                ...this.boxOptions,
                borderColor: "#FF6B6B",
                title: "DISCORD ERROR",
                titleAlignment: "center",
            },
        );
        logger.error(`Discord Error: ${error.code}`, error);
        this.originalConsole.error(this.formatMultiLineBox(discordBox));

        // 🔥 AGGIUNTO: Invia anche al WebSocket
        this.broadcastLog(
            "ERROR",
            "Discord.js",
            `${error.code || "Error"}: ${error.message}`,
        );

        if (error.code === "ECONNRESET") {
            this.logWarning("Connessione reset - riconnessione automatica...");
        } else if (error.code === "ETIMEDOUT") {
            this.logWarning(
                "Timeout connessione - riconnessione automatica...",
            );
        }
    }

    private handleDiscordWarn(warning: string): void {
        // ✅ Questo usa il console.warn normale
        console.warn(Ui.hex("#FFD93D")("⚠️  WARN: ") + Ui.white(warning));
        this.broadcastLog("WARN", "Discord", warning);
    }

    public handleError(context: string, error: any): void {
        const contextBox = Ui.drawBox(
            Ui.hex("#FF6BFF")("🚨 Errore in ") +
                Ui.hex("#4DFFFF")(context) +
                "\n\n" +
                Ui.yellow("Message: ") +
                Ui.white(error?.message || error) +
                "\n" +
                (error?.stack
                    ? Ui.yellow("Stack: ") + Ui.gray(error.stack)
                    : ""),
            {
                ...this.boxOptions,
                borderColor: "#FF6BFF",
                title: "ERROR CONTEXT",
                titleAlignment: "center",
            },
        );
        logger.error(`Context Error: ${context}`, error);
        this.originalConsole.error(this.formatMultiLineBox(contextBox));

        // 🔥 AGGIUNTO: Invia anche al WebSocket
        this.broadcastLog("ERROR", context, error?.message || String(error));
    }

    public logSuccess(message: string): void {
        const formatted = this.formatLogLine(
            Ui.white(message),
            Ui.hex("#6BFF6B")("✔️  "),
        );
        this.originalConsole.log(formatted);
        this.broadcastLog("SUCCESS", "System", message);
    }

    public logWarning(message: string): void {
        const formatted = this.formatLogLine(
            Ui.white(message),
            Ui.hex("#FFD93D")("⚠️  "),
        );
        this.originalConsole.warn(formatted);
        this.broadcastLog("WARN", "System", message);
    }

    public logInfo(message: string): void {
        const formatted = this.formatLogLine(
            Ui.white(message),
            Ui.hex("#4DFFFF")("ℹ️  "),
        );
        this.originalConsole.log(formatted);
        this.broadcastLog("INFO", "System", message);
    }

    private isInterpreting = false;

    // 🔥 NUOVO: Interceptor globale per console con formattazione uniforme
    public interceptConsole(): void {
        console.log = (...args: any[]) => {
            const msg = args
                .map((a) =>
                    typeof a === "object" ? JSON.stringify(a) : String(a),
                )
                .join(" ");

            // Stampa nel terminale con timestamp uniforme
            this.originalConsole.log(this.formatLogLine(msg));

            if (this.isInterpreting) return;
            this.isInterpreting = true;
            try {
                this.broadcastLog("INFO", "Console", msg);
            } finally {
                this.isInterpreting = false;
            }
        };

        console.warn = (...args: any[]) => {
            const msg = args
                .map((a) =>
                    typeof a === "object" ? JSON.stringify(a) : String(a),
                )
                .join(" ");

            // Stampa nel terminale con timestamp uniforme
            this.originalConsole.warn(this.formatLogLine(Ui.yellow(msg)));

            if (this.isInterpreting) return;
            this.isInterpreting = true;
            try {
                this.broadcastLog("WARN", "Console", msg);
            } finally {
                this.isInterpreting = false;
            }
        };

        console.error = (...args: any[]) => {
            const msg = args
                .map((a) =>
                    typeof a === "object" ? JSON.stringify(a) : String(a),
                )
                .join(" ");

            // Stampa nel terminale con timestamp uniforme
            this.originalConsole.error(this.formatLogLine(Ui.red(msg)));

            if (this.isInterpreting) return;
            this.isInterpreting = true;
            try {
                this.broadcastLog("ERROR", "Console", msg);
            } finally {
                this.isInterpreting = false;
            }
        };

        this.originalConsole.log(
            this.formatLogLine(
                Ui.hex("#4DFFFF")(
                    "✅ Console output intercepted for Dashboard (Uniform V2 Style)",
                ),
            ),
        );
    }
}

// Export singleton
export const errorHandler = GlobalErrorHandler.getInstance();
