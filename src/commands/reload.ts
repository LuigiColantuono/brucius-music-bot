// src/commands/reload.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { AudioManager } from "../core/AudioManager.ts";
import { PlayerManager } from "../core/PlayerManager.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { LocalizationService } from "../services/LocalizationService.ts";
import { MessageHelper } from "../utils/MessageHelper.ts";

const loc = LocalizationService.getInstance();

export const data = new SlashCommandBuilder()
    .setName("reload")
    .setDescription(loc.get("commands.reload.description", "en"))
    .setDescriptionLocalizations({
        it: loc.get("commands.reload.description", "it"),
        "en-US": loc.get("commands.reload.description", "en"),
        "en-GB": loc.get("commands.reload.description", "en"),
    });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const language = await DatabaseService.getInstance().getGuildLanguage(
            interaction.guildId,
        );
        const loc = LocalizationService.getInstance();
        const audioManager = AudioManager.getInstance();
        const playerManager = PlayerManager.getInstance(audioManager);

        await playerManager.refreshPlayer(interaction.guildId);

        await MessageHelper.sendSuccess(
            interaction,
            loc.get("commands.reload.success", language),
        );
    } catch (error: any) {
        await MessageHelper.sendError(interaction, error.message);
    }
}
