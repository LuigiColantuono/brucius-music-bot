// src/core/ContainerManager.ts - basato sul tuo esempio funzionante

import { createContainer, createSection, Separator } from "@magicyan/discord";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export class ContainerManager {
    createPlayerContainer() {
        try {
            console.log("🔧 Creazione container V2...");

            // Crea bottoni con Discord.js (come nel tuo esempio)
            const requestButton = new ButtonBuilder()
                .setCustomId("player_request")
                .setLabel("🎵 Request Song")
                .setStyle(ButtonStyle.Secondary);

            const favoritesButton = new ButtonBuilder()
                .setCustomId("player_fav")
                .setLabel("⭐ Favorites")
                .setStyle(ButtonStyle.Secondary);

            const voteButton = new ButtonBuilder()
                .setLabel("Vote for BRUCIUS🚬")
                .setStyle(ButtonStyle.Link)
                .setURL("https://top.gg/bot/1427622031029174452/vote");

            // ActionRow come nel tuo esempio funzionante
            const buttonRow =
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    requestButton,
                    favoritesButton,
                    voteButton,
                );

            // Container come nel tuo esempio funzionante
            const container = createContainer(
                0x242429,
                createSection({
                    content:
                        `**🎵 Player Musicale Brucius**\n\n` +
                        `**Prima di procedere con una richiesta, unisciti a un canale vocale.**\n` +
                        `Puoi richiedere della musica usando /play o i pulsanti qui sotto\n` +
                        `Piattaforme supportate: **YouTube** | **SoundCloud** | **Spotify** | **Twitch**\n\n` +
                        `\`Ultima azione: Nessuna\``,
                    thumbnail: {
                        media: {
                            url: "https://cdn.discordapp.com/emojis/1433572640161009747.webp",
                        },
                    },
                }),
                Separator.Default,
                Separator.Hidden,
                buttonRow, // ← ActionRow aggiunto al container
            );

            console.log("✅ Container V2 creato correttamente");
            return container;
        } catch (error) {
            console.error("❌ Errore creazione container:", error);
            throw error;
        }
    }
}
