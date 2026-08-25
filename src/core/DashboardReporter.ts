// src/core/DashboardReporter.ts
import type { BruciusBot } from "./Bot.ts";

export class DashboardReporter {
    private bot: BruciusBot;
    private dashboardUrl: string;
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor(bot: BruciusBot, dashboardUrl = "http://localhost:3001") {
        this.bot = bot;
        this.dashboardUrl = dashboardUrl;
    }

    start(intervalSeconds = 30): void {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log(
            `📊 DashboardReporter: invio dati a ${this.dashboardUrl} ogni ${intervalSeconds}s`,
        );

        // Prima segnalazione immediata
        this.sendHeartbeat();

        // Loop periodico
        this.intervalId = setInterval(() => {
            this.sendHeartbeat();
        }, intervalSeconds * 1000);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isRunning = false;
        console.log("📊 DashboardReporter fermato");
    }

    private async sendHeartbeat(): Promise<void> {
        try {
            // Prepara i dati
            const heartbeatData = {
                service: "music-bot",
                timestamp: new Date().toISOString(),
                guilds: this.bot.guilds.cache.size,
                players: this.bot.audio.kazagumo.shoukaku.players.size,
                audioConnected: this.bot.audio.isAudioConnected(),
                nodeStatus: Array.from(
                    this.bot.audio.kazagumo.shoukaku.nodes.values(),
                ).map((node: any) => ({
                    name: node.name,
                    state: node.state,
                    players: node.players?.size || 0,
                })),
                uptime: Math.floor(process.uptime()),
            };

            // Invia alla dashboard
            const response = await fetch(
                `${this.dashboardUrl}/api/music/heartbeat`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(heartbeatData),
                },
            );

            if (!response.ok) {
                console.warn(`⚠️ Dashboard non risponde: ${response.status}`);
            } else {
                console.log("✅ Heartbeat inviato alla dashboard");
            }
        } catch (_error) {
            // Non bloccare il bot se la dashboard è down
            console.warn(
                "❌ Impossibile inviare heartbeat (dashboard offline?)",
            );
        }
    }

    // Metodo per segnalare eventi importanti
    async sendEvent(eventType: string, data: any): Promise<void> {
        try {
            await fetch(`${this.dashboardUrl}/api/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service: "music-bot",
                    event: eventType,
                    data: data,
                    timestamp: new Date().toISOString(),
                }),
            });
        } catch {
            // Silently fail
        }
    }
}
