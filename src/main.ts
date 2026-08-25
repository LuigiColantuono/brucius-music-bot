import { ShardManager } from "./core/ShardManager.ts";
import { errorHandler } from "./utils/ErrorHandler.ts";

async function main() {
    try {
        const shardManager = ShardManager.getInstance();
        await shardManager.start();
    } catch (error) {
        errorHandler.handleError("MainBootstrap", error);
    }
}

main();
