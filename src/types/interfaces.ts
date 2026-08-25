export interface GuildConfig {
    id: string;
    forumId?: string;
    playerId?: string;
    settings: {
        volume?: number;
        autoPlay?: boolean;
        defaultSource?: string;
        maxQueueSize?: number;
    };
}

export interface TrackData {
    identifier: string;
    title: string;
    author: string;
    duration: number;
    uri: string;
    source: string;
    thumbnail?: string;
    requester?: string;
}

export interface QueueItem {
    track: TrackData;
    addedAt: Date;
    addedBy: string;
}

export interface PlayerState {
    guildId: string;
    currentTrack?: TrackData;
    queue: QueueItem[];
    isPlaying: boolean;
    isPaused: boolean;
    volume: number;
    loopMode: "none" | "track" | "queue";
    position: number;
}

export interface DashboardLog {
    type: "log" | "error" | "warn" | "info" | "success";
    level: string;
    module: string;
    message: string;
    timestamp: string;
    data?: any;
}
