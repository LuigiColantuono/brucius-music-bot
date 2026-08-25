// src/events/interactionCreate.ts - VERSIONE CORRETTA
import type { Interaction, StringSelectMenuBuilder } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ContainerBuilder,
    Events,
    MessageFlags,
    SectionBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import { commands } from "../commands/index.ts";
import { PlayerUI } from "../components/PlayerUI.ts";
import { DatabaseService } from "../services/DatabaseService.ts"; // Added import
import { LocalizationService } from "../services/LocalizationService.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";
import { MessageHelper } from "../utils/MessageHelper.ts";

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
    try {
        if (interaction.isChatInputCommand()) {
            const command = commands.find(
                (cmd) => cmd.data.name === interaction.commandName,
            );
            if (command) {
                await command.execute(interaction);
            }
            return;
        }

        // Gestione Menu (SelectMenu)
        if (interaction.isStringSelectMenu()) {
            const { customId, values } = interaction;

            if (customId === "fav_actions") {
                const selected = values[0]; // e.g. 'fav_play_0' or 'fav_delete_0'
                if (selected.startsWith("fav_play_")) {
                    await handleFavPlay(interaction, selected);
                } else if (selected.startsWith("fav_delete_")) {
                    await handleFavDelete(interaction, selected);
                }
            }
        }

        if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleModalInteraction(interaction);
            return;
        }

        if (interaction.isRepliable()) {
            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId!,
                );
            const loc = LocalizationService.getInstance();
            await interaction.reply({
                content: loc.get("errors.unsupported_interaction", language),
                flags: MessageFlags.Ephemeral as any,
            });
        }
    } catch (_error) {
        errorHandler.handleError("Interaction", _error);

        if (interaction.isRepliable()) {
            try {
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId!,
                    );
                const loc = LocalizationService.getInstance();
                await MessageHelper.sendError(
                    interaction as any,
                    loc.get("errors.generic", language),
                );
            } catch (_replyError) {
                console.error("Errore nella risposta di errore:", _replyError);
            }
        }
    }
}

async function handleButtonInteraction(interaction: any) {
    const customId = interaction.customId;

    console.log(
        `🎯 Bottone cliccato: "${customId}" da ${interaction.user.tag}`,
    );

    switch (customId) {
        case "player_request":
            try {
                const { ModalManager } = await import(
                    "../components/ModalManager.js"
                );
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId,
                    );
                const loc = LocalizationService.getInstance();
                const modal = ModalManager.createSongRequestModal(
                    loc.get("modals.request_title", language),
                    loc.get("modals.input_label", language),
                    loc.get("modals.input_placeholder", language),
                );
                await interaction.showModal(modal);
                console.log("✅ Modal mostrato");
            } catch (error) {
                console.error("❌ Errore creazione modal:", error);
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId,
                    );
                const loc = LocalizationService.getInstance();
                await interaction.reply({
                    content: `❌ ${loc.get("errors.modal_error", language)}`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            break;

        case "player_stop":
            await handlePlayerStop(interaction); // ✅ Ora chiama la funzione unificata
            break;

        case "player_playpause":
            await handlePlayPauseToggle(interaction);
            break;

        case "player_forward":
            await handleForward(interaction);
            break;

        case "player_backward":
            await handleBackward(interaction);
            break;

        case "player_queue":
            await handleQueue(interaction);
            break;

        case "player_fav":
            await handleViewFavorites(interaction);
            break;

        case "player_like":
            await handleSaveFavorite(interaction);
            break;

        case "player_shuffle":
            await handleShuffle(interaction);
            break;

        case "player_repeat":
            await handleRepeat(interaction);
            break;

        case "queue_close":
            // Close queue view
            try {
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId,
                    );
                const loc = LocalizationService.getInstance();
                await interaction.update({
                    content: `❌ ${loc.get("queue.closed", language)}`,
                    components: [],
                });
            } catch (_e) {
                /* ignore */
            }
            break;
        default: {
            // Handle playlist like
            if (customId === "player_like_playlist") {
                await handleSaveFavorite(interaction);
                break;
            }

            // Handle queue_play_X buttons
            if (customId.startsWith("queue_play_")) {
                await handleQueuePlay(interaction, customId);
                break;
            }

            // Handle fav_play_X buttons
            if (customId.startsWith("fav_play_")) {
                await handleFavPlay(interaction, customId);
                break;
            }

            // Handle fav_delete_X buttons
            if (customId.startsWith("fav_delete_")) {
                await handleFavDelete(interaction, customId);
                break;
            }

            // Handle fav_close
            if (customId === "fav_close") {
                try {
                    await interaction.update({ components: [] });
                } catch (_e) {
                    await interaction.deleteReply().catch(() => {});
                }
                break;
            }

            // 🔥 IGNORA I BOTTONI DI REFRESH (Gestiti dai collector nei comandi)
            if (customId.includes("refresh")) {
                break;
            }

            console.log(`⚠️ Bottone sconosciuto: "${customId}"`);
            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId,
                );
            const loc = LocalizationService.getInstance();
            await interaction.reply({
                content: `❌ ${loc.get("errors.unknown_button", language)}: ${customId}`,
                flags: MessageFlags.Ephemeral,
            });
            break;
        }
    }
}

// Handler specific functions for favorites interactions
async function handleFavPlay(interaction: any, customId: string) {
    const index = parseInt(customId.replace("fav_play_", ""), 10);
    if (Number.isNaN(index)) return;

    const bot = interaction.client as any;
    const favorites = await bot.database.getFavorites(
        interaction.guildId,
        interaction.user.id,
    );
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    const track = favorites[index];

    if (!track) {
        return MessageHelper.sendError(
            interaction,
            loc.get("messages.track_not_found", language),
        );
    }

    // Reuse logic to play via voice channel
    const voiceChannel = interaction.member?.voice.channel;
    if (!voiceChannel) {
        return MessageHelper.sendError(
            interaction,
            loc.get("messages.join_voice", language),
        );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await bot.audio.play(
        interaction.guildId,
        track.uri,
        interaction.user.id,
        language,
        voiceChannel.id,
    );

    // Update player manager... (similar to request logic)
    const { PlayerManager } = await import("../core/PlayerManager.js");
    const playerManager = PlayerManager.getInstance(bot.audio);
    if (playerManager) {
        await playerManager.handleTrackStart(
            interaction.guildId,
            result.track,
            interaction.user.id,
            voiceChannel.name,
            interaction.user.username,
        );
    }

    const isPlaylist = result.type === "PLAYLIST";
    const msgKey = isPlaylist
        ? "messages.playlist_started"
        : "messages.started";
    const emoji = isPlaylist
        ? "<:queuesolid:1450618674380669129>"
        : "<:music:1450951740093632643>";

    await MessageHelper.sendSuccess(
        interaction,
        `${emoji} ${loc.get(msgKey, language) || loc.get("messages.started", language)}: ${
            track.title
        }`,
    );
}

async function handleFavDelete(interaction: any, customId: string) {
    const index = parseInt(customId.replace("fav_delete_", ""), 10);
    if (Number.isNaN(index)) return;

    const bot = interaction.client as any;
    const favorites = await bot.database.getFavorites(
        interaction.guildId,
        interaction.user.id,
    );
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    const track = favorites[index];

    if (!track) {
        return MessageHelper.sendError(
            interaction,
            loc.get("messages.track_not_found", language),
        );
    }

    const result = await bot.database.removeFavorite(
        interaction.guildId,
        interaction.user.id,
        track.uri,
        language,
    );

    if (result.success) {
        // Refresh view
        await handleViewFavorites(interaction);
    } else {
        await MessageHelper.sendError(interaction, result.message);
    }
}

async function handleQueue(interaction: any) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import(
        "discord.js"
    );
    const { createContainer, createSection, Separator } = await import(
        "@magicyan/discord"
    );

    const bot = interaction.client as any;
    const player = bot.audio?.getPlayer(interaction.guildId);

    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();

    if (!player || (!player.queue.current && player.queue.length === 0)) {
        await MessageHelper.sendError(
            interaction,
            `❌ ${loc.get("errors.no_queue", language)}`,
        );
        return;
    }

    const current = player.queue.current;
    const queue = player.queue;

    const currentDuration = current?.length || 0;
    const queueDuration = queue.reduce(
        (acc: number, t: any) => acc + (t.length || 0),
        0,
    );
    const totalDuration = currentDuration + queueDuration;

    const page = 1;
    const pageSize = 5;
    const totalPages = Math.ceil(queue.length / pageSize) || 1;
    const pageTracks = queue.slice(0, pageSize);

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });

    // Build compact sections for queue tracks
    const trackSections: any[] = [];

    pageTracks.forEach((track: any, index: number) => {
        // Compact: "1. Title" + "Artist • Duration" on one line
        trackSections.push(
            createSection({
                content: `**${index + 1}. ${track.title}** ${track.author} ︲ \`${formatDuration(
                    track.length || 0,
                )}\``,
                button: new ButtonBuilder()
                    .setCustomId(`queue_play_${index}`)
                    .setEmoji("<:playsolid:1450618202101911553>")
                    .setStyle(ButtonStyle.Secondary),
            }),
        );
    });

    // Build compact container
    const container = createContainer(
        0x242429,
        // Header - compact
        `## <:queuesolid:1450618674380669129> ${loc.get("queue.title", language)}`,
        // Now Playing - compact single section
        current
            ? createSection({
                  content: `-# **${loc.get("playing.playing", language).toUpperCase()}**\n**${
                      current.title
                  }**\n${current.author} ︲ \`${formatDuration(current.length || 0)}\``,
                  button: new ButtonBuilder()
                      .setCustomId("player_playpause")
                      .setEmoji("<:pausesolid:1450618229239185631>")
                      .setStyle(ButtonStyle.Secondary),
              })
            : `> ${loc.get("queue.no_track", language)}`,
        Separator.Default,
        Separator.Hidden,
        // Queue tracks - compact
        ...(trackSections.length > 0
            ? trackSections
            : [`_${loc.get("queue.empty", language)}_`]),
        Separator.Default,
        // Footer - compact stats
        `-# ${queue.length} ${loc.get(
            "queue.footer",
            language,
        )} ${page}/${totalPages} • ${formatDuration(totalDuration)}`,
        // Navigation
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("queue_prev")
                .setEmoji("<:left:1453864215180869788>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId("queue_next")
                .setEmoji("<:right:1453864157978824846>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages),
            new ButtonBuilder()
                .setCustomId("player_request")
                .setEmoji("<:plus:1453676969869967455>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("queue_close")
                .setLabel("🞬")
                .setStyle(ButtonStyle.Danger),
        ),
    );

    await interaction.editReply({
        components: [container],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
}

// Handle playing a specific track from queue
async function handleQueuePlay(interaction: any, customId: string) {
    const bot = interaction.client as any;
    const player = bot.audio?.getPlayer(interaction.guildId);

    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();

    if (!player) {
        await MessageHelper.sendError(
            interaction,
            loc.get("errors.no_player", language),
        );
        return;
    }

    // Extract track index from customId (queue_play_0, queue_play_1, etc.)
    const trackIndex = parseInt(customId.replace("queue_play_", ""), 10);

    if (
        Number.isNaN(trackIndex) ||
        trackIndex < 0 ||
        trackIndex >= player.queue.length
    ) {
        await MessageHelper.sendError(
            interaction,
            loc.get("errors.track_not_found", language),
        );
        return;
    }

    // Skip to the selected track by:
    // 1. Remove all tracks before it from queue
    // 2. Skip current track
    for (let i = 0; i < trackIndex; i++) {
        player.queue.shift(); // Remove tracks before the selected one
    }

    player.skip(); // Skip to play the selected track

    await MessageHelper.sendSuccess(
        interaction,
        `<:playsolid:1450618202101911553> ${loc
            .get("interactions.playing_track", language)
            .replace(
                "{{title}}",
                player.queue[0]?.title ||
                    loc.get("interactions.track_selected", language),
            )}`,
    );
}

// ✅ FUNZIONE UNICA handlePlayerStop - RIMUOVI LA SECONDA DOPPLICATA
async function handlePlayerStop(interaction: any) {
    console.log("⏹️ Stop player...");
    const bot = interaction.client as any;
    if (bot.audio) {
        // Use getPlayer instead of accessing private/internal shoukaku structures
        const player = bot.audio.getPlayer(interaction.guildId);
        if (player) {
            await player.destroy();

            // Import PlayerManager to reset defaults
            const { PlayerManager } = await import("../core/PlayerManager.js");
            const playerManager = PlayerManager.getInstance(bot.audio);
            if (playerManager) {
                await playerManager.handlePlayerStop(
                    interaction.guildId,
                    interaction.user.id,
                    interaction.user.username,
                );
                if (player) {
                    (player as any)._shuffleActive = false;
                }
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId,
                    );
                const loc = LocalizationService.getInstance();
                await MessageHelper.sendSuccess(
                    interaction,
                    `<:stop:1452045855564497026> ${loc.get("messages.stopped_default", language)}`,
                );
            } else {
                const language =
                    await DatabaseService.getInstance().getGuildLanguage(
                        interaction.guildId,
                    );
                const loc = LocalizationService.getInstance();
                await MessageHelper.sendSuccess(
                    interaction,
                    `<:stop:1452045855564497026> ${loc.get("messages.stopped", language)}`,
                );
            }
        } else {
            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId,
                );
            const loc = LocalizationService.getInstance();
            await MessageHelper.sendError(
                interaction,
                loc.get("messages.no_player", language),
            );
        }
    }
}

// ✅ RIMUOVI QUESTA SECONDA FUNZIONE DOPPLICATA (se esiste ancora da qualche parte):
/*
async function handlePlayerStop(interaction: any) {
    console.log('⏹️ Stop player...');
    const bot = interaction.client as any;
    if (bot.audio) {
        const player = bot.audio.shoukaku.players.get(interaction.guildId);
        if (player) {
            await player.destroy();

            const { PlayerManager } = await import('../core/PlayerManager.js');
            const playerManager = PlayerManager.getInstance(bot.audio);
            if (playerManager) {
                // ❌ ERRORE: Questa chiamava handlePlayerStop con 1 solo parametro
                await playerManager.handlePlayerStop(interaction.guildId);
                await MessageHelper.sendSuccess(interaction, '⏹️ Riproduzione fermata');
            }
        }
    }
}
*/

async function handlePlayPauseToggle(interaction: any) {
    const bot = interaction.client as any;
    if (bot.audio) {
        const player = bot.audio.getPlayer(interaction.guildId);
        if (player) {
            const isPaused = player.paused;
            const newPausedState = !isPaused;

            // Kazagumo usa player.pause(boolean)
            player.pause(newPausedState);

            const { PlayerManager } = await import("../core/PlayerManager.js");
            const playerManager = PlayerManager.getInstance(bot.audio);
            if (playerManager) {
                await playerManager.handlePlayPause(
                    interaction.guildId,
                    newPausedState,
                    interaction.user.id,
                    interaction.user.username,
                );
            }

            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId,
                );
            const loc = LocalizationService.getInstance();
            await MessageHelper.sendSuccess(
                interaction,
                newPausedState
                    ? `<:pausesolid:1450618229239185631> ${loc.get("messages.paused", language)}`
                    : `<:playsolid:1450618202101911553> ${loc.get("messages.resumed", language)}`,
            );
        } else {
            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId,
                );
            const loc = LocalizationService.getInstance();
            await MessageHelper.sendError(
                interaction,
                loc.get("messages.no_player", language),
            );
        }
    }
}

async function handleForward(interaction: any) {
    const bot = interaction.client as any;
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    const player = bot.audio?.getPlayer(interaction.guildId);
    if (!player)
        return MessageHelper.sendError(
            interaction,
            loc.get("messages.no_player", language),
        );

    // Skip traccia
    player.skip();

    await MessageHelper.sendSuccess(
        interaction,
        `<:forwardsolid:1450618259182321955> ${loc.get("messages.skipped", language)}`,
    );
}

async function handleBackward(interaction: any) {
    const bot = interaction.client as any;
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    const player = bot.audio?.getPlayer(interaction.guildId);
    if (!player)
        return MessageHelper.sendError(
            interaction,
            loc.get("messages.no_player", language),
        );

    // Se siamo oltre i 5 secondi, riavvia
    if (player.position && player.position > 5000) {
        player.seek(0);
        await MessageHelper.sendSuccess(
            interaction,
            `<:backwardsolid:1450618286994882672> ${loc.get("messages.restart", language)}`,
        );
    } else {
        // Se c'è una traccia precedente implementata in Kazagumo (queue.previous)
        if (player.queue.previous) {
            player.queue.unshift(player.queue.previous);
            player.skip();
            await MessageHelper.sendSuccess(
                interaction,
                `<:backwardsolid:1450618286994882672> ${loc.get("messages.rewind", language)}`,
            );
        } else {
            // Se non c'è previous history, riavvia comunque
            player.seek(0);
            await MessageHelper.sendSuccess(
                interaction,
                `<:backwardsolid:1450618286994882672> ${loc.get("messages.restart", language)}`,
            );
        }
    }
}

async function handleShuffle(interaction: any) {
    const bot = interaction.client as any;
    const player = bot.audio?.getPlayer(interaction.guildId);
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    if (!player)
        return MessageHelper.sendError(
            interaction,
            loc.get("errors.no_player", language),
        );

    // Toggle shuffle
    const isShuffled = !(player as any)._shuffleActive;
    (player as any)._shuffleActive = isShuffled;

    if (isShuffled) {
        player.queue.shuffle();
    }

    // Trigger UI update
    const { PlayerManager } = await import("../core/PlayerManager.js");
    const playerManager = PlayerManager.getInstance(bot.audio);
    if (playerManager) {
        const isPaused = player.paused;
        await PlayerUI.updateProgress(
            interaction.guildId,
            player.queue.current,
            player.position || 0,
            isPaused,
            player.queue.length || 0,
            !!(player as any)._shuffleActive,
            player.loop,
        );
    }

    await MessageHelper.sendSuccess(
        interaction,
        isShuffled
            ? `<:shuffle:1453676868506226730> ${loc.get("errors.shuffle_on", language)}`
            : `<:shuffle:1453676868506226730> ${loc.get("errors.shuffle_off", language)}`,
    );
}

async function handleRepeat(interaction: any) {
    const bot = interaction.client as any;
    const player = bot.audio?.getPlayer(interaction.guildId);
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();
    if (!player)
        return MessageHelper.sendError(
            interaction,
            loc.get("errors.no_player", language),
        );

    // Toggle loop: none -> track -> none (as requested)
    // Kazagumo: player.loop is 'none' | 'track' | 'queue'
    const newLoop = player.loop === "track" ? "none" : "track";
    player.setLoop(newLoop);

    // Update UI
    const { PlayerManager } = await import("../core/PlayerManager.js");
    const playerManager = PlayerManager.getInstance(bot.audio);
    if (playerManager) {
        await PlayerUI.updateProgress(
            interaction.guildId,
            player.queue.current,
            player.position,
            player.paused,
            player.queue.length || 0,
        );
    }

    await MessageHelper.sendSuccess(
        interaction,
        newLoop === "track"
            ? `🔂 ${loc.get("errors.loop_on", language)}`
            : `🔂 ${loc.get("errors.loop_off", language)}`,
    );
}

// Duplicate handleFav removed

// Helper functions (add these inside/outside or reuse if possible, for now inline helper)
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSourceEmoji(sourceName: string): string {
    switch (sourceName.toLowerCase()) {
        case "youtube":
            return "<:yt:1455535305976184875>";
        case "spotify":
            return "<:spotify:1450832812222447767>";
        case "soundcloud":
            return "<:soundcloud:1450623286848393298>";
        default:
            return "🎵";
    }
}

async function handleModalInteraction(interaction: any) {
    const customId = interaction.customId;

    if (customId === "modal_song_request") {
        const query = interaction.fields.getTextInputValue("song_query");

        console.log(`🎵 MODAL RICEVUTO: "${query}"`);

        const language = await DatabaseService.getInstance().getGuildLanguage(
            interaction.guildId,
        );
        const loc = LocalizationService.getInstance();
        const voiceChannel = interaction.member?.voice.channel;
        if (!voiceChannel) {
            await MessageHelper.sendError(
                interaction,
                loc.get("messages.join_voice", language),
            );
            return;
        }

        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });

        try {
            const bot = interaction.client as any;

            if (!bot.audio?.isAudioConnected()) {
                await MessageHelper.sendError(
                    interaction,
                    loc.get("messages.lavalink_error", language),
                );
                return;
            }

            console.log("🎵 Tentativo riproduzione...");
            const result = await bot.audio.play(
                interaction.guildId,
                query,
                interaction.user.id,
                language,
                voiceChannel.id,
            );
            console.log("🎵 Risultato:", result.type);

            const channelName = voiceChannel.name;

            // Update PlayerManager
            const { PlayerManager } = await import("../core/PlayerManager.js");
            const playerManager = PlayerManager.getInstance(bot.audio);

            if (playerManager) {
                await playerManager.handleTrackStart(
                    interaction.guildId,
                    result.track,
                    interaction.user.id,
                    channelName,
                    interaction.user.username,
                );
            }

            // --- SAVE PLAYLIST DATA TO PLAYER FOR LIKE BUTTON ---
            const player = bot.audio.getPlayer(interaction.guildId);
            if (player && result.type === "PLAYLIST") {
                const totalDurationMs = result.tracks.reduce(
                    (acc: number, t: any) => acc + (t.length || 0),
                    0,
                );
                (player as any).lastPlaylist = {
                    uri:
                        (result as any).playlist?.url ||
                        (result as any).playlist?.uri ||
                        (query.startsWith("http") ? query : result.track.uri),
                    title: result.track.title,
                    count: result.tracks.length,
                    duration: totalDurationMs,
                };
            }

            // --- BUILD RESPONSE CONTAINER (V2) ---
            // --- BUILD RESPONSE CONTAINER (V2) ---
            const track = result.track;
            const isPlaylist = result.type === "PLAYLIST";
            const count = isPlaylist ? result.tracks.length : 1;

            let totalDurationMs = track.length;
            if (isPlaylist) {
                totalDurationMs = result.tracks.reduce(
                    (acc: number, t: any) => acc + (t.length || 0),
                    0,
                );
            }
            const durationStr = formatDuration(totalDurationMs);
            const sourceEmoji = getSourceEmoji(track.sourceName || "unknown");

            const section = new SectionBuilder();

            section.addTextDisplayComponents((text: any) =>
                text.setContent(
                    `## ${sourceEmoji} ${track.title.substring(0, 50)}\n` +
                        `**${count} ${
                            count === 1
                                ? loc.get("common.track_singular", language)
                                : loc.get("common.track_plural", language)
                        }**  **|**  \`${durationStr}\`  **|**  <@${interaction.user.id}>\n` +
                        `**${loc.get(
                            "playing.field_channel",
                            language,
                        )}:** \`${channelName}\`\n\n` +
                        `-# ${loc.get("messages.started", language)}`,
                ),
            );

            if (track.thumbnail) {
                section.setThumbnailAccessory({
                    type: ComponentType.Thumbnail,
                    media: { url: track.thumbnail },
                });
            }

            const container = new ContainerBuilder().addSectionComponents(
                section,
            );

            // Buttons
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        isPlaylist ? "player_like_playlist" : "player_like",
                    )
                    .setLabel(loc.get("default_player.buttons.like", language))
                    .setEmoji("<:like:1454131414483206196>")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("player_request")
                    .setLabel(
                        loc.get("default_player.buttons.request", language),
                    )
                    .setEmoji("<:plus:1453676969869967455>")
                    .setStyle(ButtonStyle.Secondary),
            );

            // container.addActionRowComponents(row); // REMOVED

            await interaction.editReply({
                content: "",
                components: [container, row],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });

            console.log("✅ Container V2 Response sent");
            console.log("✅ Player di default SOVRASCRITTO con now playing");
        } catch (error: any) {
            console.error("❌ ERRORE PLAY:", error);
            await MessageHelper.sendError(interaction, ` ${error.message}`);
        }
    }
}

async function handleSaveFavorite(interaction: any) {
    const customId = interaction.customId;
    const bot = interaction.client as any;
    const player = bot.audio?.getPlayer(interaction.guildId);
    const language = await DatabaseService.getInstance().getGuildLanguage(
        interaction.guildId,
    );
    const loc = LocalizationService.getInstance();

    const lastPlaylist = (player as any)?.lastPlaylist;
    let sanitizedTrack: any = null;

    if (customId === "player_like_playlist" && lastPlaylist) {
        sanitizedTrack = {
            title: lastPlaylist.title,
            author: "Playlist",
            uri: lastPlaylist.uri,
            isPlaylist: true,
            trackCount: lastPlaylist.count,
            length: lastPlaylist.duration,
            thumbnail: null,
            sourceName: lastPlaylist.uri.includes("spotify")
                ? "spotify"
                : "youtube",
        };
    } else {
        if (!player?.queue.current) {
            return MessageHelper.sendError(
                interaction,
                loc.get("errors.no_playing", language),
            );
        }
        const rawTrack = player.queue.current;
        sanitizedTrack = {
            title: rawTrack.title,
            author: rawTrack.author,
            uri: rawTrack.uri,
            thumbnail: rawTrack.thumbnail || rawTrack.artworkUrl || null,
            length: rawTrack.length,
            isStream: rawTrack.isStream,
            sourceName: rawTrack.sourceName,
            requester: rawTrack.requester
                ? {
                      id: (rawTrack.requester as any).id || rawTrack.requester,
                      username:
                          (rawTrack.requester as any).username || "Unknown",
                  }
                : null,
        };
    }

    try {
        const result = await bot.database.addFavorite(
            interaction.guildId,
            interaction.user.id,
            sanitizedTrack,
            language,
        );

        if (result.success) {
            const msgKey = sanitizedTrack.isPlaylist
                ? "messages.playlist_saved"
                : "messages.saved";
            await MessageHelper.sendSuccess(
                interaction,
                `<:like:1454131414483206196> ${
                    loc.get(msgKey, language) ||
                    loc.get("messages.saved", language)
                }`,
            );
        } else {
            await MessageHelper.sendError(interaction, result.message);
        }
    } catch (error) {
        console.error("Errore handleSaveFavorite:", error);
        await MessageHelper.sendError(
            interaction,
            loc.get("messages.error_saving", language),
        );
    }
}

async function handleViewFavorites(interaction: any) {
    const { createContainer, createSection, Separator } = await import(
        "@magicyan/discord"
    );
    const {
        ButtonBuilder,
        ButtonStyle,
        ActionRowBuilder,
        StringSelectMenuBuilder,
    } = await import("discord.js");

    const bot = interaction.client as any;

    try {
        const favorites = await bot.database.getFavorites(
            interaction.guildId,
            interaction.user.id,
        );
        const language = await DatabaseService.getInstance().getGuildLanguage(
            interaction.guildId,
        );
        const loc = LocalizationService.getInstance();

        // Adaptive Defer
        if (!interaction.deferred && !interaction.replied) {
            if (
                interaction.isMessageComponent() &&
                interaction.customId !== "player_fav"
            ) {
                await interaction.deferUpdate();
            } else {
                await interaction.deferReply({
                    flags: [
                        MessageFlags.Ephemeral,
                        MessageFlags.IsComponentsV2,
                    ],
                });
            }
        }

        // Favorites Header with Close Button on the right
        const headerSection = createSection({
            content: `# <:fav:1450949713959583935> **${loc.get("favorites.title", language)} (${
                favorites.length
            }/5)**`,
            button: new ButtonBuilder()
                .setCustomId("fav_close")
                .setLabel(loc.get("common.close", language))
                .setStyle(ButtonStyle.Danger),
        });

        if (!favorites || favorites.length === 0) {
            const emptyContainer = createContainer(
                0x242429,
                headerSection,
                Separator.Default,
                `_${loc.get("favorites.empty", language)}_`,
                loc.get("favorites.instructions", language),
            );

            const payload = (emptyContainer as any).toJSON
                ? (emptyContainer as any).toJSON()
                : emptyContainer;
            await interaction.editReply({
                components: [payload],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
        }

        const favSections = favorites.map((track: any, index: number) => {
            const isPlaylist = track.isPlaylist;
            const prefix = isPlaylist
                ? "<:queuesolid:1450618674380669129> "
                : "";

            let infoLine = `${track.author} ︲ \`${formatDuration(track.length || 0)}\``;
            if (isPlaylist) {
                const count = track.trackCount || 0;
                const countStr =
                    count === 1
                        ? loc.get("common.track_singular", language)
                        : loc.get("common.track_plural", language);
                infoLine = `${track.author} ︲ \`${count} ${countStr}\` ︲ \`${formatDuration(
                    track.length || 0,
                )}\``;
            }

            return createSection({
                content: `**${index + 1}. ${prefix}${track.title}** ︲ ${infoLine}`,
                button: new ButtonBuilder()
                    .setCustomId(`fav_play_${index}`)
                    .setEmoji("<:playsolid:1450618202101911553>")
                    .setStyle(ButtonStyle.Secondary),
            });
        });

        // Create Select Menu Options (Delete Only)
        const menuOptions = favorites.map((track: any, index: number) =>
            new StringSelectMenuOptionBuilder()
                .setLabel(
                    `${loc.get("favorites.delete_label", language)}${track.title.substring(0, 40)}`,
                )
                .setValue(`fav_delete_${index}`)
                .setEmoji("🗑️")
                .setDescription(
                    loc.get("favorites.delete_description", language),
                ),
        );

        // Select Menu Row
        const menuRow =
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("fav_actions")
                    .setPlaceholder(loc.get("favorites.placeholder", language))
                    .addOptions(menuOptions),
            );

        const container = createContainer(
            0x242429,
            headerSection,
            Separator.Default,
            Separator.Hidden,
            ...favSections,
            Separator.Default,
            menuRow,
        );

        const payload = (container as any).toJSON
            ? (container as any).toJSON()
            : container;
        await interaction.editReply({
            components: [payload],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
    } catch (error) {
        console.error("Errore handleViewFavorites:", error);
        if (!interaction.replied && !interaction.deferred) {
            const language =
                await DatabaseService.getInstance().getGuildLanguage(
                    interaction.guildId,
                );
            const loc = LocalizationService.getInstance();
            await MessageHelper.sendError(
                interaction,
                loc.get("errors.fav_load_error", language),
            );
        }
    }
}
