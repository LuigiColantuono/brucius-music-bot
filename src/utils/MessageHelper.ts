import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
} from "discord.js";
import { ContainerBuilder, MessageFlags } from "discord.js";

export class MessageHelper {
    static createMessageContainer(
        message: string,
        isError: boolean = false,
    ): ContainerBuilder {
        const emoji = isError
            ? "<:Xmark_Purple:1433589790585917552> "
            : "<:Check_Purple:1433572640161009747> ";

        return new ContainerBuilder().addTextDisplayComponents((text) =>
            text.setContent(`-# **${emoji} ${message.toUpperCase()}**`),
        );
    }

    // Helper per ottenere i flags corretti
    private static getFlags(): number {
        return (
            (MessageFlags.Ephemeral as number) |
            (MessageFlags.IsComponentsV2 as number)
        );
    }

    static async sendSuccess(
        interaction:
            | ButtonInteraction
            | ChatInputCommandInteraction
            | MessageComponentInteraction,
        message: string,
    ) {
        const container = MessageHelper.createMessageContainer(message);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                components: [container],
                flags: MessageHelper.getFlags(),
            });
        } else {
            await interaction.reply({
                components: [container],
                flags: MessageHelper.getFlags(),
            });
        }
    }

    static async sendError(
        interaction:
            | ButtonInteraction
            | ChatInputCommandInteraction
            | MessageComponentInteraction,
        message: string,
    ) {
        const container = MessageHelper.createMessageContainer(message, true);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                components: [container],
                flags: MessageHelper.getFlags(),
            });
        } else {
            await interaction.reply({
                components: [container],
                flags: MessageHelper.getFlags(),
            });
        }
    }

    static async modalSuccess(
        interaction: ModalSubmitInteraction,
        message: string,
    ) {
        try {
            const container = MessageHelper.createMessageContainer(message);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    components: [container],
                    flags: MessageHelper.getFlags(),
                });
            } else {
                await interaction.reply({
                    components: [container],
                    flags: MessageHelper.getFlags(),
                });
            }
        } catch (error) {
            console.log(
                "⚠️ Impossibile inviare modal success:",
                error instanceof Error ? error.message : "Unknown error",
            );
        }
    }

    static async modalError(
        interaction: ModalSubmitInteraction,
        message: string,
    ) {
        try {
            const container = MessageHelper.createMessageContainer(
                message,
                true,
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    components: [container],
                    flags: MessageHelper.getFlags(),
                });
            } else {
                await interaction.reply({
                    components: [container],
                    flags: MessageHelper.getFlags(),
                });
            }
        } catch (error) {
            console.log(
                "⚠️ Impossibile inviare modal error:",
                error instanceof Error ? error.message : "Unknown error",
            );
        }
    }

    static async followUpSuccess(
        interaction: ButtonInteraction | ChatInputCommandInteraction,
        message: string,
    ) {
        const container = MessageHelper.createMessageContainer(message);
        await interaction.followUp({
            components: [container],
            flags: MessageHelper.getFlags(),
        });
    }

    static async followUpError(
        interaction: ButtonInteraction | ChatInputCommandInteraction,
        message: string,
    ) {
        const container = MessageHelper.createMessageContainer(message, true);
        await interaction.followUp({
            components: [container],
            flags: MessageHelper.getFlags(),
        });
    }
}
