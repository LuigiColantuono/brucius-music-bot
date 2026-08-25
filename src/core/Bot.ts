import { Shard } from "buncord-cross-hosting";
import { ClusterClient } from "buncord-hybrid-sharding";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { PlayerUI } from "../components/PlayerUI.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";
import { AudioManager } from "./AudioManager.ts";
import { ContainerManager } from "./ContainerManager.ts";
import { DashboardReporter } from "./DashboardReporter.ts";

export class BruciusBot extends Client {
    public containers: ContainerManager;
    public database: DatabaseService;
    public audio: AudioManager;
    public dashboardReporter: DashboardReporter;
    public crosshost: Shard;
    public cluster: ClusterClient<Client>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        });

        this.cluster = new ClusterClient(this);
        this.crosshost = new Shard(this.cluster as any);
        this.containers = new ContainerManager();
        this.database = DatabaseService.getInstance();
        this.audio = new AudioManager(this);
        this.dashboardReporter = new DashboardReporter(this);

        // Inizializza PlayerUI con il client
        PlayerUI.initialize(this);

        console.log("✅ Bot inizializzato con Cross-Hosting support");
        this.setupEvents();
    }

    private setupEvents(): void {
        this.once(Events.ClientReady, (c) => {
            console.log(`✅ Discord.js ready: ${c.user.tag}`);
            console.log("🎵 Audio Manager is ready via Kazagumo.");
        });

        // Evento Kazagumo ready
        this.audio.kazagumo.shoukaku.on(
            "ready",
            (name: string, resumed: boolean) => {
                console.log(
                    `🎵 Lavalink connesso: ${name} ${resumed ? "(resumed)" : ""}`,
                );
            },
        );

        // Evento per errori Shoukaku
        this.audio.kazagumo.shoukaku.on(
            "error",
            (name: string, error: Error) => {
                console.error(`❌ Errore Lavalink ${name}:`, error.message);
            },
        );

        this.on("error", (error) => {
            errorHandler.handleError("Client", error);
        });
    }

    public async start(): Promise<void> {
        try {
            await this.database.connect();
            console.log("✅ Database connesso");

            await this.login(process.env.DISCORD_TOKEN);
            console.log("✅ Login completato");

            // Avvia Server API per Dashboard (Porta configurabile, default 3003 per matchare Dashboard)
            const apiPort = parseInt(
                process.env.MUSIC_BOT_API_PORT || "3003",
                10,
            );
            errorHandler.startDashboardServer(apiPort);

            errorHandler.logSuccess("Bot started successfully!");
        } catch (error) {
            console.error("❌ Errore avvio bot:", error);
            process.exit(1);
        }
    }
}
