// src/core/AudioManager.ts

import type { Client } from "discord.js";
import type { KazagumoPlayer, KazagumoTrack } from "kazagumo-bun";
import { Kazagumo } from "kazagumo-bun";
import { Connectors } from "shoukaku-bun";
import { LocalizationService } from "../services/LocalizationService.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";

export class AudioManager {
    public kazagumo: Kazagumo;
    private static instance: AudioManager;
    public client: Client;

    constructor(client: Client) {
        this.client = client;

        // Costruisci l'URL di Lavalink (solo host:porta, il protocollo ws/wss è gestito da Shoukaku)
        const isSecure = process.env.LAVALINK_SECURE === "true";
        const host = process.env.LAVALINK_HOST!;
        const port = process.env.LAVALINK_PORT || "2333";
        const lavalinkUrl = `${host}:${port}`;

        const Nodes = [
            {
                name: "main",
                url: lavalinkUrl,
                auth: process.env.LAVALINK_PASSWORD!,
                secure: isSecure,
            },
        ];

        this.kazagumo = new Kazagumo(
            {
                defaultSearchEngine: "soundcloud",
                // Plugins: [new Plugins.PlayerMoved(client)], // Opzionale se gestisci auto-move
                send: (guildId, payload) => {
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                },
            },
            new Connectors.DiscordJS(client),
            Nodes,
            {
                resume: true,
                resumeTimeout: 30,
                reconnectTries: 5,
                reconnectInterval: 5000,
                restTimeout: 10000,
                moveOnDisconnect: false,
            },
        );

        this.setupEvents();
        AudioManager.instance = this;
    }

    private setupEvents(): void {
        this.kazagumo.shoukaku.on("ready", (name: string) => {
            errorHandler.logSuccess(`Lavalink node ${name} is ready!`);
        });

        this.kazagumo.shoukaku.on("error", (name: string, error: Error) => {
            errorHandler.handleError(`Lavalink node ${name}`, error);
        });

        // Kazagumo Events
        this.kazagumo.on(
            "playerStart",
            (player: KazagumoPlayer, track: KazagumoTrack) => {
                console.log(`▶️ Playing ${track.title} in ${player.guildId}`);
                // Qui potresti chiamare handleTrackStart del PlayerManager
                this.handlePlayerEvent("start", player, track);
            },
        );

        this.kazagumo.on("playerEnd", (player: KazagumoPlayer) => {
            console.log(`⏹️ Track ended in ${player.guildId}`);
            this.handlePlayerEvent("end", player);
        });

        this.kazagumo.on("playerEmpty", (player: KazagumoPlayer) => {
            console.log(`📭 Queue empty in ${player.guildId}`);
            // player.destroy(); o gestisci timeout
            this.handlePlayerEvent("empty", player);
        });
    }

    private async handlePlayerEvent(
        event: string,
        player: KazagumoPlayer,
        track?: KazagumoTrack,
    ) {
        // Dinamic import per evitare dipendenze circolari
        try {
            const { PlayerManager } = await import("./PlayerManager.js");
            const manager = PlayerManager.getInstance(this); // Assicurati che sia inizializzato altrove o qui

            // In questo caso, siccome PlayerManager dipende da AudioManager,
            // l'istanza dovrebbe essere già pronta se passata nel main o gestita come singleton puro.
            // Se PlayerManager.getInstance() richiede AudioManager, qui avremmo un problema se non è stato creato.
            // Ma AudioManager lo stiamo creando noi ORA.

            if (manager) {
                if (event === "start" && track) {
                    // Dati fittizi per requester se non salvati nella track
                    const requesterId =
                        (track.requester as any)?.id || "Unknown";
                    const requesterName =
                        (track.requester as any)?.username || "Unknown";

                    // Recupera il canale vocale se possibile
                    const voiceChannelId = player.voiceId;
                    const channel = this.client.channels.cache.get(
                        voiceChannelId!,
                    ) as any;

                    await manager.handleTrackStart(
                        player.guildId,
                        track,
                        requesterId,
                        channel?.name || "Voice Channel",
                        requesterName,
                    );
                } else if (event === "end" || event === "empty") {
                    // await manager.handleTrackEnd(player.guildId);
                    // Nota: gestire 'empty' separatamente per ripristinare il player default
                    if (event === "empty") {
                        await manager.handleTrackEnd(player.guildId);
                    }
                }
            }
        } catch (e) {
            console.error("Error in handlePlayerEvent dynamic import:", e);
        }
    }

    public async play(
        guildId: string,
        query: string,
        requesterId: string,
        language: string = "it",
        voiceChannelId?: string,
    ): Promise<any> {
        const guild = this.client.guilds.cache.get(guildId);
        const loc = LocalizationService.getInstance();
        if (!guild) throw new Error("Guild not found");

        const member = guild.members.cache.get(requesterId);
        const voiceChannel = voiceChannelId || member?.voice.channelId;

        if (!voiceChannel)
            throw new Error(loc.get("errors.join_voice", language));

        // Crea o ottieni il player
        const player = await this.kazagumo.createPlayer({
            guildId: guildId,
            voiceId: voiceChannel,
            textId: "", // Opzionale se non mandi messaggi automatici
            deaf: true,
        });

        if ((player as any)._shuffleActive === undefined) {
            (player as any)._shuffleActive = false;
        }

        const result = await this.kazagumo.search(query, {
            requester: member?.user,
        });

        if (!result.tracks.length)
            throw new Error(loc.get("errors.not_found", language));

        if (result.type === "PLAYLIST") {
            for (const track of result.tracks) {
                player.queue.add(track);
            }
            if ((player as any)._shuffleActive) {
                player.queue.shuffle();
            }
        } else {
            player.queue.add(result.tracks[0]);
            if ((player as any)._shuffleActive) {
                player.queue.shuffle();
            }
        }

        if (!player.playing && !player.paused) player.play();

        return {
            type: result.type,
            track: result.tracks[0], // Primo brano per info
            tracks: result.tracks,
            playlist: (result as any).playlist,
        };
    }

    static getInstance(client?: Client): AudioManager {
        if (!AudioManager.instance && client) {
            new AudioManager(client);
        }
        return AudioManager.instance;
    }

    public isAudioConnected(): boolean {
        // Controlla se almeno un nodo è connesso
        return this.kazagumo.shoukaku.nodes.size > 0; // Semplificazione
    }

    public getPlayer(guildId: string): KazagumoPlayer | undefined {
        return this.kazagumo.players.get(guildId);
    }
}
