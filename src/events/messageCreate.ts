import type { Message } from "discord.js";
import { Events } from "discord.js";
import { SmartInputHandler } from "../components/SmartInputHandler.ts";
import { errorHandler } from "../utils/ErrorHandler.ts";

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    try {
        // Passa il messaggio all'handler intelligente
        const bot = message.client as any;
        await SmartInputHandler.handleMessage(message, bot);
    } catch (error) {
        errorHandler.handleError("MessageHandler", error);
    }
}
