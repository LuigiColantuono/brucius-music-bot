// src/components/PlayerContainer.ts - CON PROGRESS BAR INLINE
import type { TextDisplayBuilder } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ContainerBuilder,
    SectionBuilder,
} from "discord.js";
import { LocalizationService } from "../services/LocalizationService.ts";
import { ProgressBar } from "../utils/ProgressBar.ts";

export class PlayerContainer {
    static createNowPlayingContainer(
        trackInfo: any,
        requesterId: string,
        voiceChannel: string = "General",
        position: number = 0,
        isPaused: boolean = false,
        queueLength: number = 0,
        isShuffle: boolean = false,
        loopMode: "none" | "track" | "queue" = "none",
        language: string = "it",
    ) {
        console.log(
            `🎨 Creating CLASSIC player container for track: ${trackInfo.title}`,
        );
        const sourceConfig = PlayerContainer.getSourceConfig(
            trackInfo.sourceName,
        );
        const loc = LocalizationService.getInstance();

        // Artwork
        let artworkUrl =
            trackInfo.artworkUrl || trackInfo.thumbnail || trackInfo.image;
        if (!artworkUrl) {
            artworkUrl =
                "https://cdn.discordapp.com/emojis/1064441679849992253.png";
        }

        const duration = trackInfo.length || 0;
        const currentTime = position;

        // SECTION con thumbnail
        const section = new SectionBuilder();

        // Contenuto principale
        const title = trackInfo.uri
            ? `[\`${trackInfo.title}\`](${trackInfo.uri})`
            : `\`${trackInfo.title}\``;

        const progressText = ProgressBar.createSplit(currentTime, duration, 6);
        const statusEmoji = isPaused
            ? `<:pausesolid:1450618229239185631> **${loc.get("playing.paused", language)}**`
            : `${sourceConfig.emoji} **${loc.get("playing.playing", language)}**`;

        section.addTextDisplayComponents((text: TextDisplayBuilder) =>
            text.setContent(
                `## ${statusEmoji}\n\n` +
                    `**${loc.get("playing.title", language)}:** ${title}\n` +
                    `**${loc.get("playing.author", language)}:** \`${trackInfo.author || loc.get("playing.unknown_artist", language)}\`\n` +
                    `**${loc.get("playing.field_requested_by", language)}:** <@${requesterId}>\n` +
                    `**${loc.get("playing.field_channel", language)}:** \`${voiceChannel}\`\n` +
                    `**${loc.get("playing.field_queue", language)}:** \`${queueLength}\`\n`,
            ),
        );

        // Thumbnail (artwork)
        section.setThumbnailAccessory({
            type: ComponentType.Thumbnail,
            media: {
                url: artworkUrl,
            },
        });

        const container = new ContainerBuilder()
            .addSectionComponents(section)
            .addTextDisplayComponents((text) =>
                text.setContent(`${progressText}\n`),
            );

        // CONTROLLI DI RIPRODUZIONE (Riga 1)
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
                    isPaused ? ButtonStyle.Success : ButtonStyle.Secondary,
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
        );

        // CONTROLLI SECONDARI (Riga 2)
        const queueButtons =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("player_queue")
                    .setEmoji("<:queuesolid:1450618674380669129>")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("player_shuffle")
                    .setEmoji("<:shuffle:1453676868506226730>")
                    .setStyle(
                        isShuffle ? ButtonStyle.Success : ButtonStyle.Secondary,
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
            );

        return { container, buttons, queueButtons };
    }

    private static getSourceConfig(source: string): {
        emoji: string;
        color: number;
    } {
        const configs: Record<string, { emoji: string; color: number }> = {
            youtube: { emoji: "<:yt:1455535305976184875>", color: 0xff0000 },
            soundcloud: {
                emoji: "<:soundcloud:1450623286848393298>",
                color: 0xff3300,
            },
            spotify: {
                emoji: "<:spotify:1450832812222447767>",
                color: 0x1db954,
            },
            twitch: { emoji: "<:twitch:1450832866006138951>", color: 0x9146ff },
        };
        return configs[source] || { emoji: "🎵", color: 0x242429 };
    }
}
