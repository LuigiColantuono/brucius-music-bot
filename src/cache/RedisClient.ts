import { createClient, type RedisClientType } from "redis";

/**
 * Client Redis ottimizzato per Bun.
 * Gestisce la connessione opzionale (se REDIS_URL non è presente, il client rimane inattivo senza errori).
 */
export class RedisClient {
    public client: RedisClientType;
    private isConfigured: boolean;

    constructor() {
        const url = process.env.REDIS_URL;
        this.isConfigured = !!url;

        this.client = createClient({
            url: url || "redis://localhost:6379",
            socket: {
                reconnectStrategy: (retries) => {
                    // Limita i tentativi di riconnessione
                    if (retries > 10) return false;
                    return Math.min(retries * 100, 3000);
                },
            },
        }) as RedisClientType;

        this.client.on("error", (err) => {
            // Logga l'errore solo se Redis dovrebbe essere attivo
            if (this.isConfigured) {
                console.warn("⚠️ Redis Client Error:", err.message);
            }
        });
    }

    /**
     * Tenta la connessione solo se configurato.
     */
    public async connect(): Promise<void> {
        if (!this.isConfigured) return;
        if (this.client.isOpen) return;

        try {
            await this.client.connect();
        } catch (error) {
            if (this.isConfigured) {
                console.error("❌ Failed to connect to Redis:", error);
            }
        }
    }

    /**
     * Disconnette il client in modo sicuro.
     */
    public async disconnect(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.disconnect();
        }
    }

    /**
     * Pubblica un messaggio su un canale Redis.
     */
    public async publish(channel: string, message: any): Promise<void> {
        if (!this.client.isOpen) return;
        try {
            await this.client.publish(channel, JSON.stringify(message));
        } catch (_error) {
            // Fail silent
        }
    }

    /**
     * Salva un valore con TTL opzionale.
     */
    public async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<void> {
        if (!this.client.isOpen) return;
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, { EX: ttlSeconds });
            } else {
                await this.client.set(key, value);
            }
        } catch (_error) {
            // Fail silent
        }
    }

    /**
     * Recupera un valore.
     */
    public async get(key: string): Promise<string | null> {
        if (!this.client.isOpen) return null;
        try {
            return await this.client.get(key);
        } catch (_error) {
            return null;
        }
    }
}
