import { Client as CrossHostClient } from "buncord-cross-hosting";
import {
    ClusterManager,
    HeartbeatManager,
    ReClusterManager,
} from "buncord-hybrid-sharding";
import { errorHandler } from "../utils/ErrorHandler.ts";

export class ShardManager {
    private static instance: ShardManager;
    public manager: ClusterManager;
    public crossHostClient: CrossHostClient;

    private constructor() {
        // 1. Crea il manager (totalShards e shardList verranno dati dal Bridge!)
        this.manager = new ClusterManager(`${process.cwd()}/src/index.ts`, {
            token: process.env.DISCORD_TOKEN || "",
            shardsPerClusters: parseInt(
                process.env.BCH_SHARDS_PER_CLUSTER || "2",
                10,
            ),
            mode: "process",
            restarts: {
                max: 5,
                interval: 60000 * 60,
            },
        });

        // 2. Crea il Client che si connette al Bridge
        this.crossHostClient = new CrossHostClient({
            host: process.env.BCH_BRIDGE_HOST || "localhost",
            port: parseInt(process.env.BCH_PORT || "4444", 10),
            authToken:
                process.env.BCH_AUTH_TOKEN ||
                "brucius_grid_secure_token_2026_!",
            agent: "bot",
            rollingRestarts: true,
        });

        // 3. Collega il client al manager
        this.crossHostClient.listen(this.manager);

        this.manager.extend(
            new HeartbeatManager({
                interval: 2000,
            }),
        );

        this.manager.extend(
            new ReClusterManager({
                delay: 2000,
                timeout: 5000,
            }),
        );

        this.setupEvents();
    }

    public static getInstance(): ShardManager {
        if (!ShardManager.instance) {
            ShardManager.instance = new ShardManager();
        }
        return ShardManager.instance;
    }

    private setupEvents(): void {
        this.manager.on("clusterCreate", (cluster) => {
            errorHandler.logInfo(`Cluster ${cluster.id} spawned`);

            cluster.on("ready", () => {
                errorHandler.logSuccess(`Cluster ${cluster.id} ready`);
            });

            cluster.on("death", () => {
                errorHandler.logWarning(
                    `Cluster ${cluster.id} died, restarting...`,
                );
            });
        });

        this.manager.on("shardCreate", (shard) => {
            shard.on("ready", () => {
                errorHandler.logInfo(`Shard ${shard.id} ready`);
            });
        });

        this.crossHostClient.on("ready", () => {
            errorHandler.logSuccess(
                "Buncord Cross-Hosting Client ready and connected to Bridge",
            );
        });

        this.crossHostClient.on("debug", (msg) => {
            console.log(`🔍 [BCH Client] ${msg}`);
        });
    }

    public async start(): Promise<void> {
        try {
            let retries = 5;
            let isConnected = false;

            while (retries > 0 && !isConnected) {
                try {
                    errorHandler.logInfo(
                        `📡 [ShardManager] Collegamento al Bridge... (Tentativi rimasti: ${retries})`,
                    );

                    const connectPromise = new Promise<void>(
                        (resolve, reject) => {
                            const timeout = setTimeout(
                                () =>
                                    reject(
                                        new Error(
                                            "Bridge Connection Timeout (10s)",
                                        ),
                                    ),
                                10000,
                            );

                            this.crossHostClient.once("ready", () => {
                                clearTimeout(timeout);
                                resolve();
                            });

                            this.crossHostClient.once("error", (err) => {
                                clearTimeout(timeout);
                                reject(err);
                            });

                            this.crossHostClient.connect().catch((err) => {
                                clearTimeout(timeout);
                                reject(err);
                            });
                        },
                    );

                    await connectPromise;
                    isConnected = true;
                    errorHandler.logSuccess(
                        "✅ [ShardManager] Connesso al Bridge correttamente!",
                    );
                } catch (error) {
                    retries--;
                    if (retries === 0) {
                        errorHandler.handleError(
                            "ShardManager",
                            new Error(
                                'ERRORE FATALE: Impossibile connettersi al Bridge. Verifica che il Bridge sia attivo con "bun run bridge".',
                            ),
                        );
                        throw error;
                    }
                    errorHandler.logWarning(
                        `⚠️ [ShardManager] Connessione fallita, riprovo in 5s...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }

            // ⏳ Handshake Delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            errorHandler.logInfo(
                "📦 [ShardManager] Richiesta dati shard al Bridge...",
            );

            let response: any = null;
            let dataRetries = 3;

            while (dataRetries > 0) {
                response = await this.crossHostClient.requestShardData();
                if (response?.shardList) break;

                dataRetries--;
                if (dataRetries > 0) {
                    errorHandler.logWarning(
                        `⚠️ [ShardManager] Dati shard incompleti, riprovo tra 2s...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }

            if (!response?.shardList) {
                throw new Error(
                    "Impossibile recuperare i dati degli shard dal Bridge dopo vari tentativi.",
                );
            }

            this.manager.totalShards = response.totalShards;
            this.manager.shardList = response.shardList;

            const shardListStr = Array.isArray(response.shardList)
                ? response.shardList.join(", ")
                : response.shardList;
            errorHandler.logInfo(
                `🚀 [ShardManager] Avvio Cluster per gli shard: ${shardListStr} (Totale: ${response.totalShards})`,
            );
            await this.manager.spawn({ timeout: -1 });
        } catch (error) {
            errorHandler.handleError("ShardManager", error);
        }
    }
}
