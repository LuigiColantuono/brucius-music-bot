// src/core/InteractionTracker.ts
import type { Client } from "discord.js";
import { LocalizationService } from "../services/LocalizationService.ts";

export class InteractionTracker {
    private static lastInteractions = new Map<
        string,
        {
            userId: string;
            username: string;
            action: string;
            timestamp: Date;
            details?: string;
        }
    >();

    // Registra una nuova interazione
    static recordInteraction(
        guildId: string,
        userId: string,
        username: string,
        action: string,
        details?: string,
    ): void {
        InteractionTracker.lastInteractions.set(guildId, {
            userId,
            username,
            action,
            details,
            timestamp: new Date(),
        });

        console.log(
            `📝 Interazione registrata per ${guildId}: ${username} ${action} ${details || ""}`,
        );
    }

    // Ottieni l'ultima interazione formattata
    static getLastInteractionFormatted(
        guildId: string,
        language: string = "it",
    ): string {
        const interaction = InteractionTracker.lastInteractions.get(guildId);
        const loc = LocalizationService.getInstance();

        if (!interaction) {
            return loc.get("default_player.stopped_by", language);
        }

        const timeAgo = InteractionTracker.getTimeAgo(
            interaction.timestamp,
            language,
        );
        const username = interaction.username;
        const details = interaction.details || "";

        let actionKey = "interactions.generic";

        switch (interaction.action) {
            case "stop":
                actionKey = "interactions.stopped";
                break;
            case "play":
                actionKey = "interactions.started";
                break;
            case "pause":
                actionKey = "interactions.paused";
                break;
            case "resume":
                actionKey = "interactions.resumed";
                break;
            case "skip":
                actionKey = "interactions.skipped";
                break;
            case "queue_add":
                actionKey = "interactions.queue_add";
                break;
            case "playlist_add":
                actionKey = "interactions.playlist_add";
                break;
        }

        const actionText = loc.get(actionKey, language, {
            username,
            details,
            action: interaction.action,
        });
        return `${actionText} (${timeAgo})`;
    }

    // Ottieni l'ultima interazione raw
    static getLastInteraction(guildId: string) {
        return InteractionTracker.lastInteractions.get(guildId);
    }

    // Calcola "X tempo fa"
    private static getTimeAgo(timestamp: Date, language: string): string {
        const loc = LocalizationService.getInstance();
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        if (diffSec < 60) return loc.get("interactions.time.now", language);
        if (diffMin < 60)
            return `${diffMin} ${loc.get("interactions.time.minutes_ago", language)}`;
        if (diffHour < 24)
            return `${diffHour} ${loc.get("interactions.time.hours_ago", language)}`;

        const diffDays = Math.floor(diffHour / 24);
        return `${diffDays} ${loc.get("interactions.time.days_ago", language)}`;
    }

    // Inizializza con eventi del client (opzionale)
    static initialize(_client: Client): void {
        console.log("✅ InteractionTracker inizializzato");
    }
}
