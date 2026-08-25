// src/core/QueueManager.ts
import type { Track } from "shoukaku-bun";

export interface QueueTrack {
    track: Track;
    requesterId: string;
    requesterName: string;
    channelName: string;
}

export class QueueManager {
    private queues = new Map<string, QueueTrack[]>(); // guildId -> coda

    // Aggiungi una traccia (o un array di tracce) alla coda
    add(guildId: string, data: QueueTrack | QueueTrack[]): void {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, []);
        }

        const queue = this.queues.get(guildId)!;

        if (Array.isArray(data)) {
            queue.push(...data);
            console.log(
                `[QUEUE] Aggiunte ${data.length} tracce alla coda di ${guildId}. Dimensione: ${queue.length}`,
            );
        } else {
            queue.push(data);
            console.log(
                `[QUEUE] Aggiunta "${data.track.info.title}" alla coda di ${guildId}. Dimensione: ${queue.length}`,
            );
        }
    }

    // Prendi la prossima traccia (rimuovendola dalla coda)
    getNext(guildId: string): QueueTrack | undefined {
        const queue = this.queues.get(guildId);
        if (!queue || queue.length === 0) return undefined;

        const nextTrack = queue.shift(); // Rimuove il primo elemento
        console.log(
            `[QUEUE] Prossima traccia per ${guildId}: "${nextTrack?.track.info.title}". Rimangono: ${queue.length}`,
        );
        return nextTrack;
    }

    // Ottieni la coda senza modificarla
    getQueue(guildId: string): QueueTrack[] {
        return this.queues.get(guildId) || [];
    }

    // Svuota la coda
    clear(guildId: string): void {
        this.queues.set(guildId, []);
        console.log(`[QUEUE] Coda svuotata per ${guildId}`);
    }

    // Salta a una posizione specifica (per i pulsanti forward/backward)
    skipTo(guildId: string, index: number): QueueTrack | undefined {
        const queue = this.queues.get(guildId);
        if (!queue || index < 0 || index >= queue.length) return undefined;

        // Rimuovi tutte le tracce fino a quell'indice
        const removed = queue.splice(0, index);
        console.log(
            `[QUEUE] Saltate ${removed.length} tracce su ${guildId}. Prossima: "${queue[0]?.track.info.title}"`,
        );
        return queue[0]; // Restituisce la nuova traccia in testa
    }

    // Controlla se la coda è vuota
    isEmpty(guildId: string): boolean {
        const queue = this.queues.get(guildId);
        return !queue || queue.length === 0;
    }
}

// Singleton per usarlo ovunque
export const queueManager = new QueueManager();
