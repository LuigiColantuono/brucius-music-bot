// src/components/DefaultPlayerContainer.ts - VERSIONE V2 PURE COMPONENTS

import { createContainer, Separator } from "@magicyan/discord";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextDisplayBuilder,
} from "discord.js";
import { LocalizationService } from "../services/LocalizationService.ts";

export class DefaultPlayerContainer {
    static createMainPlayer(
        language: string = "it",
        lastInteraction: string = "",
    ) {
        const loc = LocalizationService.getInstance();
        const lastUser = lastInteraction || loc.get("common.nobody", language);
        const platforms = `> <:yt:1455535305976184875>  **Youtube**    **|**    <:soundcloud:1450623286848393298>  **Soundcloud**    **|**    <:spotify:1450832812222447767>  **Spotify**    **|**    <:twitch:1450832866006138951>  **Twitch**`;

        const titleText = loc.get("default_player.title", language);
        const instructionsText =
            `${loc.get("default_player.instructions.step1", language)}\n` +
            `${loc.get("default_player.instructions.step2", language)}\n` +
            `${loc.get("default_player.instructions.step3", language)}`;

        const platformsLabel = `**${loc.get("default_player.platforms", language)}**`;
        const lastInteractionText = `${loc.get("default_player.last_interaction", language)} **${lastUser}**`;

        // 1. Titolo come TEXT DISPLAY (non in un container = "simple text")
        const titleComponent = new TextDisplayBuilder().setContent(titleText);

        // 2. Main Body Container
        const mainContainer = createContainer(
            0x242429,
            instructionsText,
            Separator.Hidden,
            platformsLabel,
            platforms,
            Separator.Hidden,
            Separator.Default,
            Separator.Hidden,
            lastInteractionText,
        );

        // 3. Buttons row
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("player_request")
                .setLabel(loc.get("default_player.buttons.request", language))
                .setEmoji("<:music:1450951740093632643>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("player_fav")
                .setLabel(loc.get("default_player.buttons.favorites", language))
                .setEmoji("<:fav:1450949713959583935>")
                .setStyle(ButtonStyle.Secondary),
        );

        return {
            components: [titleComponent, mainContainer, row],
        };
    }
}
