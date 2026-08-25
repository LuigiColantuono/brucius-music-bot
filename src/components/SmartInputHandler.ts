// src/components/SmartInputHandler.ts
import type { Message } from "discord.js";
import { ChannelType, MessageFlags } from "discord.js";
import { AudioManager } from "../core/AudioManager.ts";
import type { BruciusBot } from "../core/Bot.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { LocalizationService } from "../services/LocalizationService.ts";

export class SmartInputHandler {
    private static URL_REGEX = /(https?:\/\/[^\s]+)/g;
    private static YOUTUBE_REGEX =
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/;
    private static SPOTIFY_REGEX =
        /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:track|playlist|album)\/([a-zA-Z0-9]+)/;
    private static SOUNDCLOUD_REGEX =
        /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/;

    static async handleMessage(
        message: Message,
        bot: BruciusBot,
    ): Promise<void> {
        if (message.author.bot) return;

        const guildConfig = await bot.database.getGuildConfig(message.guildId!);
        if (!guildConfig?.forumId) return;

        if (
            message.channel.type !== ChannelType.PublicThread &&
            message.channel.type !== ChannelType.PrivateThread
        ) {
            return;
        }

        if (message.channel.parentId !== guildConfig.forumId) return;

        const content = message.content.trim();

        if (SmartInputHandler.isValidURL(content)) {
            await SmartInputHandler.handleURL(message, bot);
            return;
        }

        if (
            content.length > 3 &&
            content.length < 200 &&
            !content.startsWith("/")
        ) {
            await SmartInputHandler.handleSearchQuery(message, bot);
            return;
        }
    }

    private static isValidURL(text: string): boolean {
        return SmartInputHandler.URL_REGEX.test(text);
    }

    private static identifySource(url: string): string {
        if (SmartInputHandler.YOUTUBE_REGEX.test(url)) return "youtube";
        if (SmartInputHandler.SPOTIFY_REGEX.test(url)) return "spotify";
        if (SmartInputHandler.SOUNDCLOUD_REGEX.test(url)) return "soundcloud";
        if (url.includes("twitch.tv")) return "twitch";
        return "unknown";
    }

    private static async handleURL(
        message: Message,
        bot: BruciusBot,
    ): Promise<void> {
        const url = message.content;
        const source = SmartInputHandler.identifySource(url);

        const voiceChannel = message.member?.voice.channel;
        const language = await DatabaseService.getInstance().getGuildLanguage(
            message.guildId!,
        );
        const loc = LocalizationService.getInstance();

        if (!voiceChannel) {
            await message.reply({
                content: `❌ ${loc.get("errors.join_voice", language)}`,
                flags: MessageFlags.Ephemeral as any, // Risolve l'errore di tipo
            });
            return;
        }

        try {
            const audioManager = AudioManager.getInstance(bot);
            await audioManager.play(
                message.guildId!,
                url,
                message.author.id,
                language,
                voiceChannel.id,
            );

            await message.reply({
                content: `✅ ${loc.get("messages.added_to_queue", language).replace("{{source}}", source)}`,
                flags: MessageFlags.Ephemeral as any,
            });
        } catch (error: any) {
            await message.reply({
                content:
                    error.message === "NO_RESULTS"
                        ? `❌ ${loc.get("errors.not_found", language)}`
                        : `❌ ${loc.get("errors.generic", language)}`,
                flags: MessageFlags.Ephemeral as any,
            });
        }
    }

    private static async handleSearchQuery(
        message: Message,
        bot: BruciusBot,
    ): Promise<void> {
        const voiceChannel = message.member?.voice.channel;
        const language = await DatabaseService.getInstance().getGuildLanguage(
            message.guildId!,
        );
        const loc = LocalizationService.getInstance();

        if (!voiceChannel) {
            await message.reply({
                content: `❌ ${loc.get("errors.join_voice", language)}`,
                flags: MessageFlags.Ephemeral as any,
            });
            return;
        }

        try {
            const audioManager = AudioManager.getInstance(bot);
            await audioManager.play(
                message.guildId!,
                message.content,
                message.author.id,
                language,
                voiceChannel.id,
            );

            await message.reply({
                content: `✅ ${loc.get("messages.search_added", language).replace("{{query}}", message.content)}`,
                flags: MessageFlags.Ephemeral as any,
            });

            setTimeout(() => {
                message.delete().catch(() => {});
            }, 5000);
        } catch (_error: any) {
            await message.reply({
                content: `❌ ${loc.get("errors.not_found", language)}`,
                flags: MessageFlags.Ephemeral as any,
            });
        }
    }
}
