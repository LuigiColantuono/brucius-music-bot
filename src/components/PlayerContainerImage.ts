// src/components/PlayerContainerImage.ts - Skin con immagine custom SEMPLIFICATA

import { Separator } from "@magicyan/discord";
import type { TextDisplayBuilder } from "discord.js";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} from "discord.js";
import { LocalizationService } from "../services/LocalizationService.ts";
import { PlayerImageService } from "../services/PlayerImageService.ts";
import { ProgressBar } from "../utils/ProgressBar.ts";

export class PlayerContainerImage {
    static async createNowPlayingContainer(
        trackInfo: any,
        requesterId: string,
        voiceChannel: string = "General",
        position: number = 0,
        isPaused: boolean = false,
        queueLength: number = 0,
        isShuffle: boolean = false,

        loopMode: "none" | "track" | "queue" = "none",
        language: string = "it",
    ): Promise<{
        container: ContainerBuilder;
        attachment: AttachmentBuilder | null;
    }> {
        console.log(
            `🎨 Creating MODERN player container for track: ${trackInfo.title}`,
        );
        // Artwork URL
        let artworkUrl =
            trackInfo.artworkUrl || trackInfo.thumbnail || trackInfo.image;
        if (!artworkUrl) {
            artworkUrl =
                "https://cdn.discordapp.com/emojis/1064441679849992253.png";
        }

        const duration = trackInfo.length || 0;

        // Genera immagine custom
        let attachment: AttachmentBuilder | null = null;
        let imageUrl = artworkUrl;

        try {
            const imageBuffer = await PlayerImageService.generatePlayerImage(
                artworkUrl,
                trackInfo.title || "Unknown",
                trackInfo.author || "Unknown Artist",
            );
            attachment = new AttachmentBuilder(imageBuffer, {
                name: "player.png",
            });
            imageUrl = "attachment://player.png";
        } catch (error) {
            console.error("❌ Errore generazione immagine:", error);
        }

        // Progress bar
        const progressText = ProgressBar.createSplit(position, duration, 10);

        // CONTAINER SEMPLIFICATO - Immagine + Info essenziali + Pulsanti
        const container = new ContainerBuilder()
            // Immagine custom
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(imageUrl),
                ),
            )
            // Info minime (solo progress, poi separator, poi metadata)
            .addTextDisplayComponents((text: TextDisplayBuilder) =>
                text.setContent(`${progressText}\n`),
            )
            .addSeparatorComponents(Separator.Hidden)
            .addTextDisplayComponents((text: TextDisplayBuilder) => {
                const loc = LocalizationService.getInstance();
                return text.setContent(
                    `**${loc.get("playing.field_requested_by", language)}:** <@${requesterId}>\n` +
                        `**${loc.get("playing.field_channel_short", language)}:** \`${voiceChannel}\`\n` +
                        `**${loc.get("playing.field_queue_short", language)}:** \`${queueLength}\`\n`,
                );
            })
            .addSeparatorComponents(Separator.Hidden)
            .addSeparatorComponents(Separator.Default)
            .addSeparatorComponents(Separator.Hidden)
            // PULSANTI RIGA 1 - Controlli principali
            .addActionRowComponents(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("player_backward")
                        .setEmoji("<:backwardsolid:1450618286994882672>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("player_playpause")
                        .setEmoji(
                            isPaused
                                ? "<:playsolid:1450618202101911553>"
                                : "<:pausesolid:1450618229239185631>",
                        )
                        .setStyle(
                            isPaused
                                ? ButtonStyle.Success
                                : ButtonStyle.Secondary,
                        ),
                    new ButtonBuilder()
                        .setCustomId("player_forward")
                        .setEmoji("<:forwardsolid:1450618259182321955>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("player_stop")
                        .setEmoji("<:stop:1452045855564497026>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("player_fav")
                        .setEmoji("<:fav:1450949713959583935>")
                        .setStyle(ButtonStyle.Secondary),
                ),
            )
            // PULSANTI RIGA 2 - Controlli secondari
            .addActionRowComponents(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("player_queue")
                        .setEmoji("<:queuesolid:1450618674380669129>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("player_shuffle")
                        .setEmoji("<:shuffle:1453676868506226730>")
                        .setStyle(
                            isShuffle
                                ? ButtonStyle.Success
                                : ButtonStyle.Secondary,
                        ),
                    new ButtonBuilder()
                        .setCustomId("player_repeat")
                        .setEmoji("<:repeatsolid:1450618373410132088>")
                        .setStyle(
                            loopMode !== "none"
                                ? ButtonStyle.Success
                                : ButtonStyle.Secondary,
                        ),
                    new ButtonBuilder()
                        .setCustomId("player_request")
                        .setEmoji("<:cerca:1454131370593878067>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("player_like")
                        .setEmoji("<:like:1454131414483206196>")
                        .setStyle(ButtonStyle.Secondary),
                ),
            );

        return { container, attachment };
    }
}
