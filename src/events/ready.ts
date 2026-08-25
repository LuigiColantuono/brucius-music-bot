import type { Client } from "discord.js";
import { Events } from "discord.js";
import { commands } from "../commands/index.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
    errorHandler.logSuccess(`✅ Loggato come ${client.user?.tag}!`);

    // Registra comandi slash
    try {
        const commandData = commands.map((cmd) => cmd.data);
        await client.application?.commands.set(commandData);
        errorHandler.logInfo(`${commandData.length} comandi slash registrati`);
    } catch (error) {
        errorHandler.handleError("CommandRegistration", error);
    }

    // Imposta status
    client.user?.setActivity({
        name: "🎵 Brucius Music",
        type: 2, // Listening
    });
}
