// src/components/PlayerUI.ts

import { MessageFlags } from "discord.js";
import { InteractionTracker } from "../core/InteractionTracker.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { DefaultPlayerContainer } from "./DefaultPlayerContainer.ts";
import { PlayerContainer } from "./PlayerContainer.ts";
import { PlayerContainerImage } from "./PlayerContainerImage.ts";

export class PlayerUI {
    private static playerThreads = new Map<
        string,
        { threadId: string; messageId: string }
    >();
    private static client: any = null;

    static initialize(client: any): void {
        PlayerUI.client = client;
        console.log("✅ PlayerUI inizializzato con client");
    }

    static async setupThread(
        guildId: string,
        threadId: string,
        messageId: string,
    ): Promise<void> {
        PlayerUI.playerThreads.set(guildId, { threadId, messageId });
        console.log(
            `📋 Thread registrato per ${guildId}: ${threadId}/${messageId}`,
        );
    }

    static async loadPersistentThreads(): Promise<void> {
        try {
            const db = DatabaseService.getInstance();
            const configs = await db.getAllGuildConfigs();

            let count = 0;
            for (const config of configs) {
                if (config.forumId && config.playerId) {
                    PlayerUI.playerThreads.set(config.id, {
                        threadId: config.forumId,
                        messageId: config.playerId,
                    });
                    count++;
                }
            }
            console.log(
                `✅ PlayerUI: Caricati ${count} thread persistenti dal database.`,
            );
        } catch (error: any) {
            console.error(
                "❌ Errore caricamento thread persistenti:",
                error.message,
            );
        }
    }

    static async showNowPlaying(
        guildId: string,
        track: any,
        requesterId: string,
        voiceChannel: string,
        position: number = 0,
        isPaused: boolean = false,
        queueLength: number = 0,
        isShuffle: boolean = false,
        loopMode: "none" | "track" | "queue" = "none",
    ): Promise<void> {
        try {
            const threadInfo = PlayerUI.playerThreads.get(guildId);
            if (!threadInfo) {
                console.error(`❌ Nessun thread trovato per ${guildId}`);
                return;
            }

            // Ottieni preferenza skin e lingua
            const db = DatabaseService.getInstance();
            const skin = await db.getGuildSkin(guildId);
            const language = await db.getGuildLanguage(guildId);

            console.log(
                `🔍 PlayerUI.showNowPlaying: Fetching skin for ${guildId} -> skin: ${skin}, lang: ${language}`,
            );

            // Ottieni il thread
            const thread = await PlayerUI.getThread(threadInfo.threadId);
            if (!thread) return;

            if (skin === "modern") {
                // Usa PlayerContainerImage con immagine custom
                const { container, attachment } =
                    await PlayerContainerImage.createNowPlayingContainer(
                        track,
                        requesterId,
                        voiceChannel,
                        position,
                        isPaused,
                        queueLength,
                        isShuffle,
                        loopMode,
                        language,
                    );

                // Modifica con attachment se presente
                await thread.messages.edit(threadInfo.messageId, {
                    content: " ",
                    components: [container],
                    files: attachment ? [attachment] : [],
                    flags: [MessageFlags.IsComponentsV2],
                });
            } else {
                // Usa PlayerContainer default
                const { container, buttons, queueButtons } =
                    PlayerContainer.createNowPlayingContainer(
                        track,
                        requesterId,
                        voiceChannel,
                        position,
                        isPaused,
                        queueLength,
                        isShuffle,
                        loopMode,
                        language,
                    );

                await thread.messages.edit(threadInfo.messageId, {
                    content: " ",
                    components: [container, buttons, queueButtons],
                    flags: [MessageFlags.IsComponentsV2],
                });
            }

            console.log(`✅ Player (skin: ${skin}) aggiornato per ${guildId}`);
        } catch (error: any) {
            console.error(
                "❌ Error in PlayerUI.showNowPlaying:",
                error.message,
            );
        }
    }

    static async updateProgress(
        guildId: string,
        track: any,
        position: number,
        isPaused: boolean,
        queueLength: number = 0,
        isShuffle: boolean = false,
        loopMode: "none" | "track" | "queue" = "none",
    ): Promise<void> {
        const threadInfo = PlayerUI.playerThreads.get(guildId);
        if (!threadInfo) return;
        const client = PlayerUI.client;
        if (!client) return;

        const thread = await client.channels.fetch(threadInfo.threadId);
        if (!thread?.isThread()) return;

        const message = await thread.messages.fetch(threadInfo.messageId);
        if (!message) return;

        const requesterId = (track.requester as any)?.id || "Unknown";
        let voiceChannelName = "Voice Channel";
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild?.members.me?.voice.channelId) {
                const channel = guild.channels.cache.get(
                    guild.members.me.voice.channelId,
                );
                if (channel) {
                    voiceChannelName = channel.name;
                }
            }
        } catch (_e) {
            // Ignore
        }

        // Ottieni preferenza skin e lingua
        const db = DatabaseService.getInstance();
        const skin = await db.getGuildSkin(guildId);
        const language = await db.getGuildLanguage(guildId);

        // console.log(`🔍 PlayerUI.updateProgress: Fetching skin for ${guildId} -> skin: ${skin}`);

        if (skin === "modern") {
            const { PlayerContainerImage } = await import(
                "./PlayerContainerImage.js"
            );
            const { container, attachment } =
                await PlayerContainerImage.createNowPlayingContainer(
                    track,
                    requesterId,
                    voiceChannelName,
                    position,
                    isPaused,
                    queueLength,
                    isShuffle,
                    loopMode,
                    language,
                );

            await message.edit({
                components: [container],
                files: attachment ? [attachment] : [],
                flags: [MessageFlags.IsComponentsV2],
            });
        } else {
            const { PlayerContainer } = await import("./PlayerContainer.js");
            const { container, buttons, queueButtons } =
                PlayerContainer.createNowPlayingContainer(
                    track,
                    requesterId,
                    voiceChannelName,
                    position,
                    isPaused,
                    queueLength,
                    isShuffle,
                    loopMode,
                    language,
                );

            await message.edit({
                components: [container, buttons, queueButtons],
                flags: [MessageFlags.IsComponentsV2],
            });
        }
    }

    static async restoreDefaultPlayer(guildId: string): Promise<void> {
        try {
            const threadInfo = PlayerUI.playerThreads.get(guildId);
            if (!threadInfo) {
                console.error(
                    `❌ Nessun thread trovato per ${guildId} durante restore`,
                );
                return;
            }

            // Ottieni lingua
            const language =
                await DatabaseService.getInstance().getGuildLanguage(guildId);

            // Ottieni l'ultima interazione
            const lastInteraction =
                InteractionTracker.getLastInteractionFormatted(
                    guildId,
                    language,
                );

            // Crea container di default
            const { components } = DefaultPlayerContainer.createMainPlayer(
                language,
                lastInteraction,
            );

            // Ottieni il thread
            const thread = await PlayerUI.getThread(threadInfo.threadId);
            if (!thread) return;

            // Modifica il messaggio (rimuovi files per pulire l'immagine)
            await thread.messages.edit(threadInfo.messageId, {
                components: components,
                files: [],
                flags: [MessageFlags.IsComponentsV2],
            });

            console.log(`✅ Player di default RIPRISTINATO per ${guildId}`);
        } catch (error: any) {
            console.error(
                "❌ Error in PlayerUI.restoreDefaultPlayer:",
                error.message,
            );
        }
    }

    private static async getThread(threadId: string): Promise<any> {
        if (!PlayerUI.client) {
            console.error("❌ Client non inizializzato in PlayerUI");
            return null;
        }

        try {
            return await PlayerUI.client.channels.fetch(threadId);
        } catch (error: any) {
            console.error(
                `❌ Error getting thread ${threadId}:`,
                error.message,
            );
            return null;
        }
    }
}
