// src/core/PlayerManager.ts - VERSIONE CORRETTA
import { PlayerUI } from "../components/PlayerUI.ts";
import type { AudioManager } from "./AudioManager.ts";
import { InteractionTracker } from "./InteractionTracker.ts";

export class PlayerManager {
    private static instance: PlayerManager;
    private audioManager: AudioManager;
    private trackStartTimes = new Map<string, Date>(); // Nuovo: traccia quando inizia ogni traccia

    private progressIntervals = new Map<string, NodeJS.Timeout>();

    private constructor(audioManager: AudioManager) {
        this.audioManager = audioManager;
        this.setupEvents();
    }

    public static getInstance(audioManager: AudioManager): PlayerManager {
        if (!PlayerManager.instance) {
            PlayerManager.instance = new PlayerManager(audioManager);
        }
        return PlayerManager.instance;
    }

    private setupEvents() {
        // ...
    }

    private startProgressLoop(guildId: string) {
        this.stopProgressLoop(guildId);

        const interval = setInterval(async () => {
            const player = this.audioManager.getPlayer(guildId);
            if (!player?.queue.current) {
                this.stopProgressLoop(guildId);
                return;
            }

            if (player.paused) return; // Non aggiornare se in pausa

            try {
                await PlayerUI.updateProgress(
                    guildId,
                    player.queue.current,
                    player.position,
                    player.paused,
                    player.queue.length || 0,
                    !!(player as any)._shuffleActive,
                    player.loop,
                );
            } catch (error: any) {
                console.warn(
                    `⚠️ Progress update failed for ${guildId}: ${error.message}. Stopping loop.`,
                );
                this.stopProgressLoop(guildId);
            }
        }, 10000); // Aggiorna ogni 10 secondi

        this.progressIntervals.set(guildId, interval);
    }

    private stopProgressLoop(guildId: string) {
        const interval = this.progressIntervals.get(guildId);
        if (interval) {
            clearInterval(interval);
            this.progressIntervals.delete(guildId);
        }
    }

    async handleTrackStart(
        guildId: string,
        track: any,
        requesterId: string,
        voiceChannelName: string,
        username: string,
    ): Promise<void> {
        try {
            const player = this.audioManager.getPlayer(guildId);
            if (!player) return;

            // Avvia loop progresso
            this.startProgressLoop(guildId);

            // Salva il tempo di inizio
            const startTime = new Date();
            this.trackStartTimes.set(guildId, startTime);

            // REGISTRA INTERAZIONE
            InteractionTracker.recordInteraction(
                guildId,
                requesterId,
                username,
                "play",
                track.title,
            );

            // SOVRASCRIVE il container
            await PlayerUI.showNowPlaying(
                guildId,
                track,
                requesterId,
                voiceChannelName,
                player.position || 0,
                false,
                player.queue.length || 0,
                !!(player as any)._shuffleActive,
                player.loop,
            );
        } catch (error) {
            console.error("Error handling track start:", error);
        }
    }

    async handleTrackEnd(guildId: string): Promise<void> {
        // Ferma loop progresso
        this.stopProgressLoop(guildId);

        const player = this.audioManager.getPlayer(guildId);
        const hasQueue = false; // TODO: Check real queue status if needed, but Kazagumo handles via playerEmpty

        if (!player || !hasQueue) {
            // RIPRISTINA il container di default se necessario
            // await PlayerUI.restoreDefaultPlayer(guildId);
            // Nota: spostato in playerEmpty event in AudioManager
        }
    }

    async handlePlayerStop(
        guildId: string,
        userId: string,
        username: string,
    ): Promise<void> {
        try {
            // Ferma loop progresso
            this.stopProgressLoop(guildId);

            // REGISTRA INTERAZIONE REALE
            InteractionTracker.recordInteraction(
                guildId,
                userId,
                username,
                "stop",
            );

            // RIPRISTINA il container di default
            await PlayerUI.restoreDefaultPlayer(guildId);
        } catch (error) {
            console.error("Error handling player stop:", error);
        }
    }

    async handlePlayPause(
        guildId: string,
        isPaused: boolean,
        userId: string,
        username: string,
    ): Promise<void> {
        // REGISTRA INTERAZIONE REALE
        InteractionTracker.recordInteraction(
            guildId,
            userId,
            username,
            isPaused ? "pause" : "resume",
        );

        const player = this.audioManager.getPlayer(guildId);
        const currentTrack = player?.queue?.current;

        if (currentTrack) {
            const requesterId = (currentTrack.requester as any)?.id || userId;
            const channel = this.audioManager.client?.channels.cache.get(
                player.voiceId!,
            );

            // Ensure _shuffleActive is initialized if not present
            if ((player as any)._shuffleActive === undefined) {
                (player as any)._shuffleActive = false;
            }

            await PlayerUI.showNowPlaying(
                guildId,
                currentTrack,
                requesterId,
                (channel as any)?.name || "Voice Channel",
                player.position || 0,
                isPaused,
                player.queue.length || 0,
                !!(player as any)._shuffleActive,
                player.loop,
            );
        } else {
            await PlayerUI.restoreDefaultPlayer(guildId);
        }
    }

    public async refreshPlayer(guildId: string): Promise<void> {
        try {
            const player = this.audioManager.getPlayer(guildId);

            if (player?.queue.current) {
                // Se c'è un brano in riproduzione, forza l'aggiornamento della UI
                console.log(
                    `🔄 Refreshing player UI for ${guildId} (Playing: ${player.queue.current.title})`,
                );

                const voiceChannelId = player.voiceId;
                const channel = this.audioManager.client?.channels.cache.get(
                    voiceChannelId!,
                ) as any;
                const requesterId =
                    (player.queue.current.requester as any)?.id || "Unknown";

                // Riavvia il loop del progresso
                this.startProgressLoop(guildId);

                // Aggiorna la UI "Now Playing"
                await PlayerUI.showNowPlaying(
                    guildId,
                    player.queue.current,
                    requesterId,
                    channel?.name || "Voice Channel",
                    player.position || 0,
                    player.paused,
                    player.queue.length || 0,
                    !!(player as any)._shuffleActive,
                    player.loop,
                );
            } else {
                // Altrimenti ripristina il player di default
                console.log(
                    `🔄 No active track for ${guildId}, restoring default player.`,
                );
                this.stopProgressLoop(guildId);
                await PlayerUI.restoreDefaultPlayer(guildId);
            }
        } catch (error) {
            console.error(`❌ Error refreshing player for ${guildId}:`, error);
            // In caso di errore critico, proviamo almeno a ripristinare il default
            await PlayerUI.restoreDefaultPlayer(guildId);
        }
    }

    getAudioManager(): AudioManager {
        return this.audioManager;
    }
}
