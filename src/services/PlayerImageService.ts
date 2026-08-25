// src/services/PlayerImageService.ts - VERSIONE CORRETTA

import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

const __dirname = import.meta.dir;

// Registra font Noto
try {
    GlobalFonts.registerFromPath(
        join(__dirname, "../assets/fonts/NotoSans-Bold.ttf"),
        "NotoSans-Bold",
    );
    GlobalFonts.registerFromPath(
        join(__dirname, "../assets/fonts/NotoSans-Regular.ttf"),
        "NotoSans-Regular",
    );
} catch (e) {
    console.warn("⚠️ Font registration warning:", e);
}

export class PlayerImageService {
    // Dimensioni immagine (match reference: ~350px wide)
    private static readonly WIDTH = 330;
    private static readonly HEIGHT = 70;
    private static readonly THUMB_SIZE = 70; // Thumbnail quadrata

    /**
     * Genera l'immagine del player:
     * - Thumbnail quadrata a sinistra
     * - Banner blur con titolo/artista a destra
     */
    static async generatePlayerImage(
        artworkUrl: string,
        title: string,
        artist: string,
    ): Promise<Buffer> {
        const canvas = createCanvas(
            PlayerImageService.WIDTH,
            PlayerImageService.HEIGHT,
        );
        const ctx = canvas.getContext("2d");

        // Sfondo base scuro
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, PlayerImageService.WIDTH, PlayerImageService.HEIGHT);

        try {
            // Carica artwork
            const artwork = await loadImage(artworkUrl);

            // === SEZIONE DESTRA: Banner blur ===
            const bannerX = PlayerImageService.THUMB_SIZE;
            const bannerWidth =
                PlayerImageService.WIDTH - PlayerImageService.THUMB_SIZE;

            // Disegna artwork come sfondo blur del banner destro
            ctx.save();
            ctx.beginPath();
            ctx.rect(bannerX, 0, bannerWidth, PlayerImageService.HEIGHT);
            ctx.clip();

            // Scala e posiziona per blur effect
            ctx.filter = "blur(15px) brightness(0.4)";
            ctx.drawImage(
                artwork,
                bannerX - 30,
                -30,
                bannerWidth + 60,
                PlayerImageService.HEIGHT + 60,
            );
            ctx.filter = "none";
            ctx.restore();

            // Overlay gradiente per profondità
            const gradient = ctx.createLinearGradient(
                bannerX,
                0,
                PlayerImageService.WIDTH,
                0,
            );
            gradient.addColorStop(0, "rgba(0, 0, 0, 0.6)");
            gradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
            ctx.fillStyle = gradient;
            ctx.fillRect(bannerX, 0, bannerWidth, PlayerImageService.HEIGHT);

            // === SEZIONE SINISTRA: Thumbnail quadrata ===
            ctx.save();
            // Clip quadrato con bordi leggermente arrotondati
            PlayerImageService.roundRect(
                ctx,
                0,
                0,
                PlayerImageService.THUMB_SIZE,
                PlayerImageService.HEIGHT,
                0,
            );
            ctx.clip();
            // Disegna thumbnail (fill to cover)
            const scale = Math.max(
                PlayerImageService.THUMB_SIZE / artwork.width,
                PlayerImageService.HEIGHT / artwork.height,
            );
            const scaledW = artwork.width * scale;
            const scaledH = artwork.height * scale;
            const offsetX = (PlayerImageService.THUMB_SIZE - scaledW) / 2;
            const offsetY = (PlayerImageService.HEIGHT - scaledH) / 2;
            ctx.drawImage(artwork, offsetX, offsetY, scaledW, scaledH);
            ctx.restore();

            // Bordo separatore tra thumbnail e banner
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PlayerImageService.THUMB_SIZE, 0);
            ctx.lineTo(
                PlayerImageService.THUMB_SIZE,
                PlayerImageService.HEIGHT,
            );
            ctx.stroke();

            // === TESTO: Titolo e Artista ===
            const textX = PlayerImageService.THUMB_SIZE + 15;
            const textMaxWidth = bannerWidth - 30;

            // Titolo (bold, grande)
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 16px NotoSans-Bold, Arial, sans-serif";
            const truncatedTitle = PlayerImageService.truncateText(
                ctx,
                title,
                textMaxWidth,
            );
            ctx.fillText(
                truncatedTitle,
                textX,
                PlayerImageService.HEIGHT / 2 - 5,
            );

            // Artista (regular, più piccolo, grigio)
            ctx.fillStyle = "#a0a0a0";
            ctx.font = "13px NotoSans-Regular, Arial, sans-serif";
            const truncatedArtist = PlayerImageService.truncateText(
                ctx,
                artist,
                textMaxWidth,
            );
            ctx.fillText(
                truncatedArtist,
                textX,
                PlayerImageService.HEIGHT / 2 + 18,
            );
        } catch (error) {
            console.error("❌ Errore generazione immagine player:", error);

            // Fallback: sfondo scuro con testo
            ctx.fillStyle = "#2C2F33";
            ctx.fillRect(
                0,
                0,
                PlayerImageService.WIDTH,
                PlayerImageService.HEIGHT,
            );

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 16px Arial, sans-serif";
            ctx.fillText(
                title.substring(0, 25),
                15,
                PlayerImageService.HEIGHT / 2,
            );

            ctx.fillStyle = "#a0a0a0";
            ctx.font = "13px Arial, sans-serif";
            ctx.fillText(
                artist.substring(0, 25),
                15,
                PlayerImageService.HEIGHT / 2 + 20,
            );
        }

        return canvas.toBuffer("image/png");
    }

    /**
     * Rettangolo arrotondato
     */
    private static roundRect(
        ctx: any,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height,
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Tronca testo se troppo lungo
     */
    private static truncateText(
        ctx: any,
        text: string,
        maxWidth: number,
    ): string {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (
            ctx.measureText(`${truncated}...`).width > maxWidth &&
            truncated.length > 0
        ) {
            truncated = truncated.slice(0, -1);
        }
        return `${truncated}...`;
    }
}
