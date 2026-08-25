// src/utils/ProgressBar.ts - VERSIONE CORRETTA
export class ProgressBar {
    // Emoji per la barra di progresso
    private static readonly EMOJIS = {
        start: "<:progressbarleftfull:1452066739163500687>",
        full: "<:progressbarfull:1450885377710882837>",
        knob: "<:progressbardivider:1450885466055376978>",
        empty: "<:progressbarempty:1450885954276688065>",
        endKnob: "<:progressbarend:1452068758645506140>", // Fine con pallino (100%)
        rightEmpty: "<:progressbarrightempty:1450885632112201911>", // Fine vuota
        startEmpty: "<:progressbarleftempty:1452065337947197572>",
    };

    /**
     * Crea una barra di avanzamento con il pallino nella posizione corretta
     * @param current Tempo corrente in millisecondi
     * @param total Durata totale in millisecondi
     * @param size Numero di blocchi centrali
     */
    public static create(
        current: number,
        total: number,
        size: number = 10,
    ): string {
        if (total <= 0 || current <= 0) {
            return (
                ProgressBar.EMOJIS.startEmpty +
                ProgressBar.EMOJIS.empty.repeat(size) +
                ProgressBar.EMOJIS.rightEmpty
            );
        }

        const percentage = Math.min(current / total, 1);

        // Se siamo all'inizio
        if (current < 2000) {
            return (
                ProgressBar.EMOJIS.startEmpty +
                ProgressBar.EMOJIS.empty.repeat(size) +
                ProgressBar.EMOJIS.rightEmpty
            );
        }

        // Se siamo alla fine (o quasi)
        if (percentage >= 0.99) {
            return (
                ProgressBar.EMOJIS.start +
                ProgressBar.EMOJIS.full.repeat(size) +
                ProgressBar.EMOJIS.endKnob
            );
        }

        // Calcolo posizione pallino nei blocchi centrali
        const knobPosition = Math.floor(size * percentage);

        let bar = "";

        // Inizio
        bar += ProgressBar.EMOJIS.start;

        // Centrale
        for (let i = 0; i < size; i++) {
            if (i === knobPosition) {
                bar += ProgressBar.EMOJIS.knob;
            } else if (i < knobPosition) {
                bar += ProgressBar.EMOJIS.full;
            } else {
                bar += ProgressBar.EMOJIS.empty;
            }
        }

        // Fine (vuota perché non siamo al 100%)
        bar += ProgressBar.EMOJIS.rightEmpty;

        return bar;
    }

    /**
     * Versione con tempo accanto alla barra (in linea)
     */
    public static createInline(
        current: number,
        total: number,
        size: number = 10,
    ): string {
        const bar = ProgressBar.create(current, total, size);
        const currentTime = ProgressBar.formatTime(current);
        const totalTime = ProgressBar.formatTime(total);

        // In linea: barra spazi tempo
        return `${bar}  \`${currentTime} / ${totalTime}\``;
    }

    /**
     * Versione con tempo sotto la barra
     */
    public static createWithTime(
        current: number,
        total: number,
        size: number = 10,
    ): string {
        const bar = ProgressBar.create(current, total, size);
        const currentTime = ProgressBar.formatTime(current);
        const totalTime = ProgressBar.formatTime(total);

        // Sotto: barra \n tempo
        return `${bar}\n\`${currentTime} / ${totalTime}\``;
    }

    /**
     * Formatta millisecondi in minuti:secondi
     */
    private static formatTime(ms: number): string {
        if (ms <= 0) return "0:00";

        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    /**
     * Versione con i tempi all'inizio e alla fine (es: 0:19 [━━🔘━━] 2:24)
     */
    public static createSplit(
        current: number,
        total: number,
        size: number = 10,
    ): string {
        const bar = ProgressBar.create(current, total, size);
        const currentTime = ProgressBar.formatTime(current);
        const totalTime = ProgressBar.formatTime(total);

        return `\`${currentTime}\`   ${bar}   \`${totalTime}\``;
    }

    /**
     * Versione alternativa: mostra progresso con percentuale
     */
    public static createWithPercentage(
        current: number,
        total: number,
        size: number = 10,
    ): string {
        const bar = ProgressBar.create(current, total, size);
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

        return `${bar}  ${percentage}%`;
    }
}
