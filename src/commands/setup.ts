// src/commands/setup.ts - CON SELEZIONE SKIN
import type { ChatInputCommandInteraction, ForumChannel } from "discord.js";
import {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import { DefaultPlayerContainer } from "../components/DefaultPlayerContainer.ts";
import { PlayerUI } from "../components/PlayerUI.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { LocalizationService } from "../services/LocalizationService.ts";
import { MessageHelper } from "../utils/MessageHelper.ts";

const loc = LocalizationService.getInstance();

export const data = new SlashCommandBuilder()
    .setName("setup")
    .setDescription(loc.get("commands.setup.description", "en"))
    .setDescriptionLocalizations({
        it: loc.get("commands.setup.description", "it"),
        "en-US": loc.get("commands.setup.description", "en"),
        "en-GB": loc.get("commands.setup.description", "en"),
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
        option
            .setName("forum")
            .setDescription("Forum dove inviare il player")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildForum),
    )
    .addStringOption((option) =>
        option
            .setName("skin")
            .setDescription("Seleziona la skin del player")
            .setRequired(false)
            .addChoices(
                { name: "Classic (Thumbnail)", value: "classic" },
                { name: "Modern (Banner)", value: "modern" },
            ),
    )
    .addStringOption((option) =>
        option
            .setName("language")
            .setDescription("Seleziona la lingua del bot / Select bot language")
            .setRequired(false)
            .addChoices(
                { name: "Italiano 🇮🇹", value: "it" },
                { name: "English 🇺🇸", value: "en" },
            ),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const forum = interaction.options.getChannel("forum") as ForumChannel;
        const skinOption = interaction.options.getString("skin");
        const skin = (skinOption || "classic") as "classic" | "modern";
        const language = (interaction.options.getString("language") || "it") as
            | "it"
            | "en";

        console.log(
            `🔍 Setup: forum=${forum.id}, skinOption=${skinOption}, skin=${skin}, lang=${language}`,
        );

        const db = DatabaseService.getInstance();
        const loc = LocalizationService.getInstance();

        // Salva preferenze
        await db.setGuildSkin(interaction.guildId!, skin);
        await db.setGuildLanguage(interaction.guildId!, language);

        console.log(
            `🎨 Skin: ${skin}, 🌐 Lang: ${language} per ${interaction.guildId}`,
        );

        // Crea il container
        const { components } =
            DefaultPlayerContainer.createMainPlayer(language);

        console.log("📦 Container creato con DefaultPlayerContainer");

        const thread = await forum.threads.create({
            name: "Ｓｏｎｇ Ｒｅｑｕｅｓｔｓ",
            message: {
                components,
                flags: [MessageFlags.IsComponentsV2],
            },
        });

        MessageHelper.sendSuccess(
            interaction,
            `Thread creato: ${thread.name} (${thread.id})`,
        );

        // ✅ IMPORTANTE: Registra lo starter message (che contiene tutto il player V2)
        const starterMessage = await thread.fetchStarterMessage();
        if (starterMessage) {
            PlayerUI.initialize(interaction.client);
            await PlayerUI.setupThread(
                interaction.guildId!,
                thread.id,
                starterMessage.id,
            );

            // Salva nel database per persistenza
            await db.setPlayerConfig(
                interaction.guildId!,
                thread.id,
                starterMessage.id,
            );

            console.log(
                `📋 Player registrato e salvato per ${interaction.guildId}: ${thread.id}/${starterMessage.id}`,
            );
        }

        const skinLabel = skin === "modern" ? "Modern" : "Classic";
        const langLabel = language === "it" ? "Italiano 🇮🇹" : "English 🇺🇸";

        await MessageHelper.sendSuccess(
            interaction,
            `${loc.get("setup.success", language)}**\n\n` +
                `> ${loc.get("setup.field_thread", language)}: ${thread}\n` +
                `> ${loc.get("setup.field_forum", language)}: ${forum}\n` +
                `> ${loc.get("setup.field_skin", language)}: ${skinLabel}\n` +
                `> ${loc.get("setup.field_language", language)}: ${langLabel}\n\n` +
                `${loc.get("setup.footer_ready", language)}`,
        );
    } catch (error: any) {
        console.error("❌ ERRORE COMPLETO setup:", error);
        await MessageHelper.sendError(
            interaction,
            `Errore configurazione:\n\`\`\`\n${error.message}\n\`\`\``,
        );
    }
}
