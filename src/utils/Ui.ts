/**
 * 🎨 Brucius Native UI - Zero Dependencies Terminal Interface
 *
 * Replacement for chalk and boxen using native ANSI codes and Unicode box-drawing.
 * Absolute Cinema, 100% Bun-native.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 ANSI Color Codes
// ═══════════════════════════════════════════════════════════════════════════

const ANSI = {
    // Reset
    reset: "\x1b[0m",

    // Text Styles
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",

    // Basic Colors
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",

    // Bright Colors
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌈 Hex Color Support
// ═══════════════════════════════════════════════════════════════════════════

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) throw new Error(`Invalid hex color: ${hex}`);

    return {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
    };
}

function rgb(r: number, g: number, b: number, text: string): string {
    if (!Bun.enableANSIColors) return text;
    return `\x1b[38;2;${r};${g};${b}m${text}${ANSI.reset}`;
}

function hex(color: string): (text: string) => string {
    return (text: string) => {
        if (!Bun.enableANSIColors) return text;
        const { r, g, b } = hexToRgb(color);
        return rgb(r, g, b, text);
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Color Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function applyColor(code: string, text: string): string {
    if (!Bun.enableANSIColors) return text;
    return `${code}${text}${ANSI.reset}`;
}

export const colors = {
    // Basic Colors
    black: (text: string) => applyColor(ANSI.black, text),
    red: (text: string) => applyColor(ANSI.red, text),
    green: (text: string) => applyColor(ANSI.green, text),
    yellow: (text: string) => applyColor(ANSI.yellow, text),
    blue: (text: string) => applyColor(ANSI.blue, text),
    magenta: (text: string) => applyColor(ANSI.magenta, text),
    cyan: (text: string) => applyColor(ANSI.cyan, text),
    white: (text: string) => applyColor(ANSI.white, text),
    gray: (text: string) => applyColor(ANSI.gray, text),

    // Bright Colors
    brightRed: (text: string) => applyColor(ANSI.brightRed, text),
    brightGreen: (text: string) => applyColor(ANSI.brightGreen, text),
    brightYellow: (text: string) => applyColor(ANSI.brightYellow, text),
    brightBlue: (text: string) => applyColor(ANSI.brightBlue, text),
    brightMagenta: (text: string) => applyColor(ANSI.brightMagenta, text),
    brightCyan: (text: string) => applyColor(ANSI.brightCyan, text),
    brightWhite: (text: string) => applyColor(ANSI.brightWhite, text),

    // Styles
    bold: (text: string) => applyColor(ANSI.bold, text),
    dim: (text: string) => applyColor(ANSI.dim, text),
    italic: (text: string) => applyColor(ANSI.italic, text),
    underline: (text: string) => applyColor(ANSI.underline, text),

    // Hex Support
    hex,
};

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Unicode Box Drawing
// ═══════════════════════════════════════════════════════════════════════════

const BOX_CHARS = {
    // Single Line
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",

    // Double Line (alternative)
    doubleTopLeft: "╔",
    doubleTopRight: "╗",
    doubleBottomLeft: "╚",
    doubleBottomRight: "╝",
    doubleHorizontal: "═",
    doubleVertical: "║",
};

interface BoxOptions {
    padding?: number;
    margin?: number;
    borderColor?: string;
    borderStyle?: "single" | "double";
    title?: string;
    titleAlignment?: "left" | "center" | "right";
}

/**
 * Draws a box around text using Unicode box-drawing characters
 */
export function drawBox(content: string, options: BoxOptions = {}): string {
    const {
        padding = 1,
        margin = 0,
        borderColor = "#FF6BFF",
        borderStyle = "single",
        title,
        titleAlignment = "center",
    } = options;

    // Select box characters based on style
    const chars =
        borderStyle === "double"
            ? {
                  tl: BOX_CHARS.doubleTopLeft,
                  tr: BOX_CHARS.doubleTopRight,
                  bl: BOX_CHARS.doubleBottomLeft,
                  br: BOX_CHARS.doubleBottomRight,
                  h: BOX_CHARS.doubleHorizontal,
                  v: BOX_CHARS.doubleVertical,
              }
            : {
                  tl: BOX_CHARS.topLeft,
                  tr: BOX_CHARS.topRight,
                  bl: BOX_CHARS.bottomLeft,
                  br: BOX_CHARS.bottomRight,
                  h: BOX_CHARS.horizontal,
                  v: BOX_CHARS.vertical,
              };

    // Split content into lines and calculate max width
    const lines = content.split("\n");

    // Strip ANSI codes for width calculation
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
    const maxContentWidth = Math.max(
        ...lines.map((line) => stripAnsi(line).length),
    );

    const contentWidth = maxContentWidth + padding * 2;

    // Build the box
    const marginStr = " ".repeat(margin);
    const paddingStr = " ".repeat(padding);
    const result: string[] = [];

    // Add top margin
    if (margin > 0) {
        for (let i = 0; i < margin; i++) {
            result.push("");
        }
    }

    // Create border color function
    const borderColorFn = hex(borderColor);

    // Top border with optional title
    if (title) {
        const titleText = ` ${title} `;
        const titleLength = titleText.length;
        const remainingWidth = contentWidth - titleLength;

        let leftBorder = "";
        let rightBorder = "";

        if (titleAlignment === "left") {
            leftBorder = chars.h.repeat(2);
            rightBorder = chars.h.repeat(remainingWidth - 2);
        } else if (titleAlignment === "right") {
            leftBorder = chars.h.repeat(remainingWidth - 2);
            rightBorder = chars.h.repeat(2);
        } else {
            // center
            const leftLen = Math.floor(remainingWidth / 2);
            const rightLen = remainingWidth - leftLen;
            leftBorder = chars.h.repeat(leftLen);
            rightBorder = chars.h.repeat(rightLen);
        }

        result.push(
            marginStr +
                borderColorFn(
                    chars.tl + leftBorder + titleText + rightBorder + chars.tr,
                ),
        );
    } else {
        result.push(
            marginStr +
                borderColorFn(
                    chars.tl + chars.h.repeat(contentWidth) + chars.tr,
                ),
        );
    }

    // Top padding
    for (let i = 0; i < padding; i++) {
        result.push(
            marginStr +
                borderColorFn(chars.v) +
                " ".repeat(contentWidth) +
                borderColorFn(chars.v),
        );
    }

    // Content lines
    for (const line of lines) {
        const strippedLine = stripAnsi(line);
        const lineLength = strippedLine.length;
        const rightPadding = maxContentWidth - lineLength;

        result.push(
            marginStr +
                borderColorFn(chars.v) +
                paddingStr +
                line +
                " ".repeat(rightPadding) +
                paddingStr +
                borderColorFn(chars.v),
        );
    }

    // Bottom padding
    for (let i = 0; i < padding; i++) {
        result.push(
            marginStr +
                borderColorFn(chars.v) +
                " ".repeat(contentWidth) +
                borderColorFn(chars.v),
        );
    }

    // Bottom border
    result.push(
        marginStr +
            borderColorFn(chars.bl + chars.h.repeat(contentWidth) + chars.br),
    );

    // Add bottom margin
    if (margin > 0) {
        for (let i = 0; i < margin; i++) {
            result.push("");
        }
    }

    return result.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 Export Default Interface (Chalk-like API)
// ═══════════════════════════════════════════════════════════════════════════

export default {
    ...colors,
    drawBox,
    box: drawBox, // Alias for boxen compatibility
};
