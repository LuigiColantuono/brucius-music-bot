import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { RedisClient } from "../cache/RedisClient.ts";
import Ui from "../utils/Ui.ts";

type LogLevel = "info" | "warn" | "error" | "debug" | "http";

/**
 * Logger ad alte prestazioni ottimizzato per Bun.
 * Sostituisce Winston riducendo il carico di CPU e memoria.
 */
export class Logger {
    private static instance: Logger;
    private redis: RedisClient;
    private logDir = join(process.cwd(), "logs");
    private errorLogPath = join(process.cwd(), "logs", "error.log");
    private combinedLogPath = join(process.cwd(), "logs", "combined.log");
    private readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
    private initialized = false;

    private constructor() {
        this.redis = new RedisClient();
        this.setup();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private async setup() {
        if (this.initialized) return;
        try {
            await mkdir(this.logDir, { recursive: true });
            await this.redis.connect();
            this.initialized = true;
        } catch (_error) {
            // Passive fail
        }
    }

    private async ensureInitialized() {
        if (!this.initialized) await this.setup();
    }

    /**
     * Ruota i log se superano la dimensione massima.
     */
    private async rotateIfNeeded(filePath: string) {
        try {
            const stats = await stat(filePath);
            if (stats.size >= this.MAX_LOG_SIZE) {
                const timestamp = new Date()
                    .toISOString()
                    .replace(/[:.]/g, "-");
                await rename(filePath, `${filePath}.${timestamp}`);
            }
        } catch (_error) {
            // Ignora errori di rotazione (es. file non esistente)
        }
    }

    /**
     * Scrittura asincrona su file utilizzando le API ad alte prestazioni di Bun.
     */
    private async writeToFile(level: LogLevel, message: string, meta?: any) {
        await this.ensureInitialized();

        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (meta && Object.keys(meta).length > 0) {
            logLine += ` ${JSON.stringify(meta)}`;
        }
        logLine += "\n";

        await this.rotateIfNeeded(this.combinedLogPath);
        // Usiamo appendFile per la massima compatibilità e stabilità in Bun
        await appendFile(this.combinedLogPath, logLine);

        if (level === "error") {
            await this.rotateIfNeeded(this.errorLogPath);
            await appendFile(this.errorLogPath, logLine);
        }
    }

    private printToConsole(level: LogLevel, message: string, meta?: any) {
        const timestamp = new Date().toLocaleTimeString();
        let coloredLevel: string;

        switch (level) {
            case "info":
                coloredLevel = Ui.blue("INFO");
                break;
            case "warn":
                coloredLevel = Ui.yellow("WARN");
                break;
            case "error":
                coloredLevel = Ui.red("ERROR");
                break;
            case "debug":
                coloredLevel = Ui.magenta("DEBUG");
                break;
            case "http":
                coloredLevel = Ui.green("HTTP");
                break;
            default:
                coloredLevel = level;
        }

        const formattedMsg = `[${Ui.gray(timestamp)}] ${coloredLevel}: ${message}`;

        if (level === "error") {
            console.error(formattedMsg);
            if (meta?.error) console.error(Ui.red(meta.error));
            if (meta && !meta.error) console.error(meta);
        } else {
            console.log(formattedMsg);
            if (meta && Object.keys(meta).length > 0) console.log(meta);
        }
    }

    private async publishToRedis(level: LogLevel, message: string, meta?: any) {
        if (!this.redis.client.isOpen) return;

        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            module: meta?.type || "system",
            ...meta,
        };

        // Alert critici
        if (level === "error" || level === "warn") {
            this.redis.publish("logs:system", logEntry).catch(() => {});
        }

        await this.cacheLogForDashboard(logEntry);
    }

    private log(level: LogLevel, message: string, meta?: any) {
        // Il Logger è il "Motore": si occupa di persistenza e dashboard
        this.writeToFile(level, message, meta).catch(() => {});
        this.publishToRedis(level, message, meta).catch(() => {});
    }

    /**
     * Stampa manuale se necessario (usato raramente, preferire ErrorHandler)
     */
    public print(level: LogLevel, message: string, meta?: any) {
        this.printToConsole(level, message, meta);
    }

    public info(message: string, meta?: any): void {
        this.log("info", message, meta);
    }

    public warn(message: string, meta?: any): void {
        this.log("warn", message, meta);
    }

    public error(message: string, error?: any, meta?: any): void {
        const errorMsg = error instanceof Error ? error.stack : error;
        const errorMeta = { ...meta, error: errorMsg };
        this.log("error", message, errorMeta);

        if (error instanceof Error && this.isCriticalError(error)) {
            this.sendCriticalAlert(error, meta).catch(() => {});
        }
    }

    public debug(message: string, meta?: any): void {
        if (process.env.DEBUG === "true") {
            this.log("debug", message, meta);
        }
    }

    public http(message: string, meta?: any): void {
        this.log("http", message, meta);
    }

    public async logPerformance(
        operation: string,
        duration: number,
        meta?: any,
    ): Promise<void> {
        this.info(`⏱️ ${operation} - ${duration}ms`, {
            type: "performance",
            operation,
            duration,
            ...meta,
        });

        if (this.redis.client.isOpen) {
            await this.redis
                .publish("metrics:performance", {
                    operation,
                    duration,
                    timestamp: Date.now(),
                    ...meta,
                })
                .catch(() => {});
        }
    }

    public async logBusinessEvent(event: string, data: any): Promise<void> {
        this.info(`💰 Business: ${event}`, {
            type: "business",
            event,
            ...data,
        });

        if (this.redis.client.isOpen) {
            await this.redis
                .publish("metrics:business", {
                    event,
                    timestamp: Date.now(),
                    ...data,
                })
                .catch(() => {});
        }
    }

    public async logClusterEvent(
        clusterId: number,
        event: string,
        data?: any,
    ): Promise<void> {
        this.info(`🔄 Cluster ${clusterId}: ${event}`, {
            type: "cluster",
            clusterId,
            event,
            ...data,
        });

        if (this.redis.client.isOpen) {
            await this.redis
                .set(
                    `logs:cluster:${clusterId}:${event}`,
                    JSON.stringify({ timestamp: Date.now(), ...data }),
                    3600, // TTL 1 ora
                )
                .catch(() => {});
        }
    }

    public logRateLimit(key: string, limit: number, window: number): void {
        this.warn(`🚫 Rate limit exceeded: ${key}`, {
            type: "rate_limit",
            key,
            limit,
            window,
        });
    }

    private isCriticalError(error: Error): boolean {
        const criticalPatterns = [
            /ENOMEM/i,
            /ECONNREFUSED/i,
            /ETIMEDOUT/i,
            /database/i,
            /redis/i,
            /payment/i,
        ];
        return criticalPatterns.some(
            (pattern) =>
                pattern.test(error.message) || pattern.test(error.name),
        );
    }

    private async sendCriticalAlert(error: Error, meta?: any): Promise<void> {
        if (!this.redis.client.isOpen) return;
        try {
            await this.redis.publish("alerts:critical", {
                type: "critical_error",
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                timestamp: new Date().toISOString(),
                meta,
            });
        } catch (_e) {}
    }

    public async cleanup(): Promise<void> {
        await this.redis.disconnect();
    }

    public async getRecentLogs(limit = 100): Promise<any[]> {
        if (!this.redis.client.isOpen) return [];
        try {
            const logs = await this.redis.client.lRange(
                "logs:history",
                0,
                limit - 1,
            );
            return logs.map((l) => JSON.parse(l));
        } catch (_error) {
            return [];
        }
    }

    public async cacheLogForDashboard(logEntry: any): Promise<void> {
        if (!this.redis.client.isOpen) return;
        try {
            const listKey = "logs:history";
            const pipeline = this.redis.client.multi();
            pipeline.lPush(listKey, JSON.stringify(logEntry));
            pipeline.lTrim(listKey, 0, 1999);
            await pipeline.exec();
        } catch (_error) {}
    }
}

export const logger = Logger.getInstance();
