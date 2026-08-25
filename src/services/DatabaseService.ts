// src/services/DatabaseService.ts

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";

export class DatabaseService {
    private prisma: PrismaClient;
    private static instance: DatabaseService;
    private isConnected: boolean = false;

    private constructor() {
        const connectionString = `${process.env.DATABASE_URL}`;
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);

        this.prisma = new PrismaClient({
            adapter,
            log: ["warn", "error"],
        });
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async connect(): Promise<void> {
        try {
            if (!process.env.DATABASE_URL) {
                console.warn(
                    "⚠️ DATABASE_URL non configurato. Modalità senza database.",
                );
                this.isConnected = false;
                return;
            }

            await this.prisma.$connect();
            this.isConnected = true;
            await this.prisma.$queryRaw`SELECT 1`;
            errorHandler.logSuccess("Database connected");
        } catch (error: any) {
            console.error("❌ Errore connessione database:", error.message);
            this.isConnected = false;
            errorHandler.handleError("Database", error);
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.prisma.$disconnect();
            this.isConnected = false;
        }
    }

    private checkConnection(): boolean {
        if (!this.isConnected) {
            console.warn("⚠️ Database non connesso. Operazione saltata.");
            return false;
        }
        return true;
    }

    // Guild Operations
    public async getGuildConfig(guildId: string): Promise<any> {
        if (!this.checkConnection()) return null;
        try {
            return await this.prisma.guild.findUnique({
                where: { id: guildId },
            });
        } catch (error: any) {
            console.error(
                `❌ Errore getGuildConfig per ${guildId}:`,
                error.message,
            );
            return null;
        }
    }

    public async saveGuildConfig(guildId: string, config: any): Promise<any> {
        if (!this.checkConnection()) return null;
        try {
            return await this.prisma.guild.upsert({
                where: { id: guildId },
                update: config,
                create: { id: guildId, ...config },
            });
        } catch (error: any) {
            console.error(
                `❌ Errore saveGuildConfig per ${guildId}:`,
                error.message,
            );
            return null;
        }
    }

    // Skin & Language Operations
    public async getGuildSkin(guildId: string): Promise<"classic" | "modern"> {
        if (!this.checkConnection()) return "classic";
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { id: guildId },
            });
            const settings = (guild?.settings as any) || {};
            const skin = settings.playerSkin || "classic";
            console.log(
                `💾 DB: getGuildSkin(${guildId}) -> skin: ${skin}, settings: ${JSON.stringify(settings)}`,
            );
            return skin;
        } catch (error: any) {
            console.error(
                `❌ DB: Error getGuildSkin(${guildId}):`,
                error.message,
            );
            return "classic";
        }
    }

    public async setGuildSkin(
        guildId: string,
        skin: "classic" | "modern",
    ): Promise<void> {
        if (!this.checkConnection()) return;
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { id: guildId },
            });
            const settings = {
                ...((guild?.settings as any) || {}),
                playerSkin: skin,
            };
            await this.prisma.guild.upsert({
                where: { id: guildId },
                update: { settings },
                create: { id: guildId, settings },
            });
            console.log(`✅ DB: setGuildSkin(${guildId}, ${skin}) SUCCESS`);
        } catch (error: any) {
            console.error(
                `❌ DB: Error setGuildSkin(${guildId}, ${skin}):`,
                error.message,
            );
        }
    }

    public async getGuildLanguage(guildId: string): Promise<"it" | "en"> {
        if (!this.checkConnection()) return "it";
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { id: guildId },
            });
            const settings = (guild?.settings as any) || {};
            return settings.language || "it";
        } catch {
            return "it";
        }
    }

    public async setGuildLanguage(
        guildId: string,
        language: "it" | "en",
    ): Promise<void> {
        if (!this.checkConnection()) return;
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { id: guildId },
            });
            const settings = { ...((guild?.settings as any) || {}), language };
            await this.prisma.guild.upsert({
                where: { id: guildId },
                update: { settings },
                create: { id: guildId, settings },
            });
        } catch {}
    }

    public async setPlayerConfig(
        guildId: string,
        threadId: string,
        messageId: string,
    ): Promise<void> {
        if (!this.checkConnection()) return;
        try {
            await this.prisma.guild.upsert({
                where: { id: guildId },
                update: { forumId: threadId, playerId: messageId },
                create: { id: guildId, forumId: threadId, playerId: messageId },
            });
            console.log(`✅ DB: setPlayerConfig(${guildId}) SUCCESS`);
        } catch (error: any) {
            console.error(
                `❌ DB: Error setPlayerConfig(${guildId}):`,
                error.message,
            );
        }
    }

    public async getAllGuildConfigs(): Promise<any[]> {
        if (!this.checkConnection()) return [];
        try {
            return await this.prisma.guild.findMany();
        } catch (error: any) {
            console.error(`❌ DB: Error getAllGuildConfigs:`, error.message);
            return [];
        }
    }

    // Queue Operations
    public async getQueue(guildId: string): Promise<any> {
        if (!this.checkConnection()) return null;
        try {
            return await this.prisma.queue.findFirst({ where: { guildId } });
        } catch {
            return null;
        }
    }

    public async saveQueue(
        guildId: string,
        tracks: any[],
        current: number = 0,
        isPlaying: boolean = false,
    ): Promise<any> {
        if (!this.checkConnection()) return null;
        try {
            const existing = await this.prisma.queue.findFirst({
                where: { guildId },
            });
            if (existing) {
                return await this.prisma.queue.update({
                    where: { id: existing.id },
                    data: { tracks, current, isPlaying },
                });
            }
            return await this.prisma.queue.create({
                data: { guildId, tracks, current, isPlaying },
            });
        } catch {
            return null;
        }
    }

    // Favorites Operations
    public async addFavorite(
        guildId: string,
        userId: string,
        track: any,
        language: string = "it",
    ): Promise<{ success: boolean; message: string }> {
        if (!this.checkConnection())
            return { success: false, message: "DB Disconnected" };
        try {
            const { LocalizationService } = await import(
                "./LocalizationService.js"
            );
            const loc = LocalizationService.getInstance();

            await this.prisma.guild.upsert({
                where: { id: guildId },
                update: {},
                create: { id: guildId },
            });

            let favorites = await this.prisma.playlist.findFirst({
                where: { guildId, userId, name: "Favorites" },
            });

            if (!favorites) {
                favorites = await this.prisma.playlist.create({
                    data: {
                        guildId,
                        userId,
                        name: "Favorites",
                        tracks: [],
                        isPublic: false,
                    },
                });
            }

            const tracks = (favorites.tracks as any[]) || [];
            if (tracks.length >= 5)
                return {
                    success: false,
                    message: loc.get("errors.fav_limit", language),
                };
            if (tracks.some((t) => t.uri === track.uri))
                return {
                    success: false,
                    message: loc.get("errors.fav_duplicate", language),
                };

            tracks.push(track);
            await this.prisma.playlist.update({
                where: { id: favorites.id },
                data: { tracks },
            });

            return {
                success: true,
                message: loc.get("messages.saved", language),
            };
        } catch (_error: any) {
            return { success: false, message: "Error saving favorite" };
        }
    }

    public async getFavorites(guildId: string, userId: string): Promise<any[]> {
        if (!this.checkConnection()) return [];
        try {
            const favs = await this.prisma.playlist.findFirst({
                where: { guildId, userId, name: "Favorites" },
            });
            return (favs?.tracks as any[]) || [];
        } catch {
            return [];
        }
    }

    public async removeFavorite(
        guildId: string,
        userId: string,
        trackUri: string,
        language: string = "it",
    ): Promise<{ success: boolean; message: string }> {
        if (!this.checkConnection())
            return { success: false, message: "DB Disconnected" };
        try {
            const { LocalizationService } = await import(
                "./LocalizationService.js"
            );
            const loc = LocalizationService.getInstance();

            const favs = await this.prisma.playlist.findFirst({
                where: { guildId, userId, name: "Favorites" },
            });
            if (!favs)
                return {
                    success: false,
                    message: loc.get("errors.fav_not_found", language),
                };

            let tracks = (favs.tracks as any[]) || [];
            const originalLength = tracks.length;
            tracks = tracks.filter((t) => t.uri !== trackUri);

            if (tracks.length === originalLength)
                return {
                    success: false,
                    message: loc.get("errors.fav_not_found", language),
                };

            await this.prisma.playlist.update({
                where: { id: favs.id },
                data: { tracks },
            });
            return {
                success: true,
                message: loc.get("messages.removed", language),
            };
        } catch {
            return { success: false, message: "Error removing favorite" };
        }
    }

    public async ping(): Promise<number> {
        if (!this.checkConnection()) return -1;
        try {
            const start = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            return Date.now() - start;
        } catch {
            return -1;
        }
    }
}
