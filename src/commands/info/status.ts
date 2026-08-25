import { createContainer, createSection, Separator } from "@magicyan/discord";
import { getInfo } from "buncord-hybrid-sharding";
import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    type ChatInputCommandInteraction,
    ComponentType,
    version as djsVersion,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { BruciusBot } from "../../core/Bot.ts";
import { DatabaseService } from "../../services/DatabaseService.ts";
import { LocalizationService } from "../../services/LocalizationService.ts";
import { errorHandler } from "../../utils/ErrorHandler.ts";
import { MessageHelper } from "../../utils/MessageHelper.ts";

const msToTime = (ms: number): string => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join("︲") || "0s";
};

const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
    fallback: T,
): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
};

const loc = LocalizationService.getInstance();

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription(loc.get("commands.status.description", "en"))
    .setDescriptionLocalizations({
        it: loc.get("commands.status.description", "it"),
        "en-US": loc.get("commands.status.description", "en"),
        "en-GB": loc.get("commands.status.description", "en"),
    });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const client = interaction.client as BruciusBot;
    const db = DatabaseService.getInstance();
    const loc = LocalizationService.getInstance();

    const language =
        (interaction.guildId
            ? await withTimeout(
                  db.getGuildLanguage(interaction.guildId),
                  2000,
                  "en",
              )
            : "en") || "en";

    try {
        const fetchStats = async () => {
            let totalGuilds = client.guilds.cache.size;
            let totalMembers = client.guilds.cache.reduce(
                (acc, g) => acc + (g.memberCount || 0),
                0,
            );
            let ipcLat = "N/A";

            // 1. Network Ping (Internet Latency via HEAD request)
            const networkStart = performance.now();
            const networkPing: any = await withTimeout<any>(
                fetch("https://discord.com", {
                    method: "HEAD",
                    signal: AbortSignal.timeout(2000),
                }).then(() => Math.round(performance.now() - networkStart)),
                2000,
                "N/A",
            ).catch(() => "N/A");

            // 2. API Ping (Discord REST API)
            const apiPingStart = Date.now();
            await withTimeout(client.rest.get("/users/@me"), 2000, null).catch(
                () => null,
            );
            const apiPing = Date.now() - apiPingStart;

            // 3. WS Ping (WebSocket Gateway)
            const wsPing = client.ws.ping || 0;

            if (client.crosshost) {
                try {
                    // 1. IPC Heartbeat (Request)
                    const startIPC = performance.now();
                    const heartbeat = await withTimeout(
                        client.crosshost.request(
                            { _type: 3 },
                            { internal: true },
                        ),
                        2000,
                        null,
                    );
                    if (heartbeat !== null) {
                        ipcLat = `${Math.round(performance.now() - startIPC)}ms`;
                    } else {
                        ipcLat = "Timeout";
                    }

                    // 2. DELAY DEFENSIVO: Evita che i pacchetti TCP si fondano nel buffer del bridge (JSON parse error fix)
                    await new Promise((resolve) => setTimeout(resolve, 150));

                    // 3. Grid-wide stats aggregation - UNIFICATA IN UNA SOLA CHIAMATA (Performance & Stabilità)
                    const rawResults = await withTimeout(
                        client.crosshost.broadcastEval(`
                        ({
                            guilds: this.guilds.cache.size,
                            members: this.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
                        })
                    `),
                        5000,
                        [],
                    );

                    // FLATTENING IBRIDO SICURO
                    const results = Array.isArray(rawResults)
                        ? rawResults.flat(Infinity)
                        : [];

                    const gridGuilds = results.reduce(
                        (a, b) => a + (Number(b?.guilds) || 0),
                        0,
                    );
                    const gridMembers = results.reduce(
                        (a, b) => a + (Number(b?.members) || 0),
                        0,
                    );

                    if (gridGuilds > 0) {
                        totalGuilds = gridGuilds;
                        totalMembers = gridMembers;
                    }
                } catch (e) {
                    console.error(
                        "[Status] Grid IPC Error:",
                        (e as Error).message,
                    );
                }
            }

            const dbStart = Date.now();
            await withTimeout(db.ping(), 2000, -1);
            const dbPing = Date.now() - dbStart;

            let ownerTag = "Unknown";
            try {
                const owner = await withTimeout(
                    client.users.fetch("562539445061025802"),
                    2000,
                    null,
                );
                if (owner) ownerTag = owner.tag;
            } catch {}

            return {
                botUsername: client.user!.username,
                totalGuilds,
                totalMembers,
                runtime: `Bun v${Bun.version}`,
                djsVersion: djsVersion,
                ownerTag,
                ownerId: "562539445061025802",
                clusterId: getInfo().CLUSTER ?? 0,
                shardId: interaction.guild?.shardId ?? 0,
                guildsThisShard: client.guilds.cache.size,
                membersThisShard: client.guilds.cache.reduce(
                    (acc, g) => acc + (g.memberCount || 0),
                    0,
                ),
                memoryUsage: (
                    process.memoryUsage().heapUsed /
                    1024 /
                    1024
                ).toFixed(2),
                networkPing,
                apiPing,
                wsPing,
                dbPing,
                ipcLat,
                uptime: msToTime(client.uptime ?? 0),
                requesterTag: interaction.user.tag,
            };
        };

        const buildBotInfoContainer = async (
            disabled: boolean = false,
            showTimestamp: boolean = false,
        ) => {
            const data = await fetchStats();

            const refreshButton = new ButtonBuilder()
                .setCustomId(
                    disabled ? "status-refresh-disabled" : "status-refresh",
                )
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("1465147007831380128")
                .setDisabled(disabled);

            const container = createContainer(
                0x242429,
                createSection({
                    content: loc.get("botinfo.ui.botinfo.title", language),
                    button: refreshButton,
                }),
                Separator.Hidden,
                Separator.Default,
                Separator.Hidden,
                loc.get("botinfo.ui.botinfo.general_stats", language),
                "```ansi\n" +
                    `\u001b[33m${loc.get("botinfo.ui.botinfo.server_count", language)}:\u001b[0m \u001b[36m${data.totalGuilds}\u001b[0m\n` +
                    `\u001b[33m${loc.get("botinfo.ui.botinfo.user_count", language)}:\u001b[0m \u001b[36m${data.totalMembers}\u001b[0m\n` +
                    "```",
                Separator.Hidden,
                loc.get("botinfo.ui.botinfo.bot_stats", language),
                "```ansi\n" +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.runtime", language)}:\u001b[0m \u001b[2;36m${data.runtime}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.djs_version", language)}:\u001b[0m \u001b[2;36mv${data.djsVersion}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.database", language)}:\u001b[0m \u001b[2;36mPostgreSQL\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.network_latency", language)}:\u001b[0m \u001b[2;36m${typeof data.networkPing === "number" ? `${data.networkPing}ms` : data.networkPing}\u001b[0m\n` +
                    "```",
                Separator.Hidden,
                loc.get("botinfo.ui.botinfo.developer", language),
                "```ansi\n" +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.name", language)}:\u001b[0m \u001b[2;31m${data.ownerTag}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.id", language)}:\u001b[0m \u001b[2;36m${data.ownerId}\u001b[0m\n` +
                    "```",
                Separator.Hidden,
                loc.get("botinfo.ui.botinfo.cluster_shard", language, {
                    clusterId: data.clusterId.toString(),
                    shardId: data.shardId.toString(),
                }),
                "```ansi\n" +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.servers_this_shard", language)}:\u001b[0m \u001b[2;36m${data.guildsThisShard}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.users_this_shard", language)}:\u001b[0m \u001b[2;36m${data.membersThisShard}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.memory", language)}:\u001b[0m \u001b[2;36m${data.memoryUsage} MB\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.api_ping", language)}:\u001b[0m \u001b[2;36m${data.apiPing}ms\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.ws_ping", language)}:\u001b[0m \u001b[2;36m${data.wsPing}ms\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.ipc_ping", language)}:\u001b[0m \u001b[2;36m${data.ipcLat}\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.db_ping", language)}:\u001b[0m \u001b[2;36m${data.dbPing}ms\u001b[0m\n` +
                    `\u001b[2;33m${loc.get("botinfo.ui.botinfo.uptime", language)}:\u001b[0m \u001b[2;36m${data.uptime}\u001b[0m\n` +
                    "```",
                Separator.Hidden,
                loc.get("botinfo.ui.botinfo.useful_links", language),
                Separator.Hidden,
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel(
                            loc.get("botinfo.buttons.invite_bot", language),
                        )
                        .setURL(
                            "https://discord.com/oauth2/authorize?client_id=1427622031029174452&permissions=2816247435095255&integration_type=0&scope=applications.commands+bot",
                        )
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel(
                            loc.get("botinfo.buttons.support_server", language),
                        )
                        .setURL("https://discord.gg/XqJw52d35R")
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel(loc.get("botinfo.buttons.website", language))
                        .setURL("https://music.brucius.dev")
                        .setStyle(ButtonStyle.Link),
                ),
                Separator.Hidden,
                Separator.Default,
                Separator.Hidden,
            );

            if (showTimestamp) {
                const timestamp = Math.floor(Date.now() / 1000);
                container.addTextDisplayComponents((text) =>
                    text.setContent(
                        loc.get("botinfo.ui.botinfo.updated", language, {
                            timestamp: timestamp.toString(),
                        }),
                    ),
                );
                container.addSeparatorComponents(Separator.Hidden);
            }

            if (disabled) {
                container.addTextDisplayComponents((text) =>
                    text.setContent(
                        loc.get("botinfo.ui.botinfo.timeout_message", language),
                    ),
                );
                container.addSeparatorComponents(Separator.Hidden);
            }

            container.addTextDisplayComponents((text) =>
                text.setContent(
                    loc.get("botinfo.ui.botinfo.requested_by", language, {
                        requester: data.requesterTag,
                    }),
                ),
            );

            return container;
        };

        const container = await buildBotInfoContainer(false, false);
        await interaction.editReply({
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
        });

        const collector = (
            await interaction.fetchReply()
        ).createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300_000,
            filter: (i: ButtonInteraction) =>
                i.user.id === interaction.user.id &&
                i.customId === "status-refresh",
        });

        collector.on(
            "collect",
            async (buttonInteraction: ButtonInteraction) => {
                try {
                    if (
                        !buttonInteraction.deferred &&
                        !buttonInteraction.replied
                    ) {
                        await buttonInteraction.deferUpdate().catch(() => {});
                    }

                    const newContainer = await buildBotInfoContainer(
                        false,
                        true,
                    );

                    await buttonInteraction
                        .editReply({
                            components: [newContainer],
                            flags: [MessageFlags.IsComponentsV2],
                        })
                        .catch(() => {});

                    const logMsg = loc.get(
                        "botinfo.messages.stats_updated",
                        language,
                    );
                    await MessageHelper.followUpSuccess(
                        buttonInteraction,
                        logMsg,
                    ).catch(() => {});
                } catch (error) {
                    console.error("[Status] Refresh error:", error);
                    const errMsg = loc.get(
                        "botinfo.messages.error_updating",
                        language,
                    );
                    await MessageHelper.followUpError(
                        buttonInteraction,
                        errMsg,
                    ).catch(() => {});
                }
            },
        );

        collector.on("end", async () => {
            try {
                const finalContainer = await buildBotInfoContainer(true, false);
                await interaction
                    .editReply({
                        components: [finalContainer],
                        flags: [MessageFlags.IsComponentsV2],
                    })
                    .catch(() => {});
            } catch {}
        });
    } catch (error) {
        errorHandler.handleError("Status Command", error);
        const failMsg = loc.get("commands.status.error_fetching", language);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: failMsg }).catch(() => {});
        } else {
            await interaction
                .reply({ content: failMsg, flags: MessageFlags.Ephemeral })
                .catch(() => {});
        }
    }
}
