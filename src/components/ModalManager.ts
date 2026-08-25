import {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

export class ModalManager {
    static createSongRequestModal(
        title: string = "🎵 Richiedi una canzone",
        label: string = "URL o Titolo della canzone",
        placeholder: string = "Incolla URL YouTube/Spotify/SoundCloud o scrivi il nome...",
    ): ModalBuilder {
        const modal = new ModalBuilder()
            .setCustomId("modal_song_request")
            .setTitle(title);

        const songInput = new TextInputBuilder()
            .setCustomId("song_query")
            .setLabel(label)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(placeholder)
            .setRequired(true)
            .setMaxLength(500);

        const firstActionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(songInput);
        modal.addComponents(firstActionRow);

        return modal;
    }

    static createPlaylistModal(): ModalBuilder {
        const modal = new ModalBuilder()
            .setCustomId("modal_create_playlist")
            .setTitle("📁 Crea Playlist");

        const nameInput = new TextInputBuilder()
            .setCustomId("playlist_name")
            .setLabel("Nome Playlist")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("My Awesome Playlist")
            .setRequired(true)
            .setMaxLength(50);

        const descInput = new TextInputBuilder()
            .setCustomId("playlist_description")
            .setLabel("Descrizione (opzionale)")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Descrizione della playlist...")
            .setRequired(false)
            .setMaxLength(200);

        const firstActionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
        const secondActionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(descInput);

        modal.addComponents(firstActionRow, secondActionRow);
        return modal;
    }

    static createSearchConfirmModal(query: string): ModalBuilder {
        const modal = new ModalBuilder()
            .setCustomId("modal_search_confirm")
            .setTitle("🔍 Conferma Ricerca");

        const confirmInput = new TextInputBuilder()
            .setCustomId("search_query")
            .setLabel("Vuoi cercare questa canzone?")
            .setStyle(TextInputStyle.Short)
            .setValue(query)
            .setRequired(true)
            .setMaxLength(200);

        const actionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                confirmInput,
            );
        modal.addComponents(actionRow);

        return modal;
    }

    static createSettingsModal(currentSettings: any): ModalBuilder {
        const modal = new ModalBuilder()
            .setCustomId("modal_player_settings")
            .setTitle("⚙️ Impostazioni Player");

        const volumeInput = new TextInputBuilder()
            .setCustomId("setting_volume")
            .setLabel("Volume (1-100)")
            .setStyle(TextInputStyle.Short)
            .setValue(currentSettings.volume?.toString() || "50")
            .setRequired(true);

        const actionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(volumeInput);
        modal.addComponents(actionRow);

        return modal;
    }
}
