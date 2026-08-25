import { Bridge } from "buncord-cross-hosting";

const bridge = new Bridge({
    port: parseInt(process.env.BCH_PORT || "4444", 10),
    authToken: process.env.BCH_AUTH_TOKEN || "brucius_grid_secure_token_2026_!",
    totalShards:
        process.env.BCH_TOTAL_SHARDS === "auto"
            ? "auto"
            : parseInt(process.env.BCH_TOTAL_SHARDS || "1", 10),
    totalMachines: parseInt(process.env.BCH_TOTAL_MACHINES || "1", 10),
    shardsPerCluster: parseInt(process.env.BCH_SHARDS_PER_CLUSTER || "2", 10),
    token: process.env.DISCORD_TOKEN || "",
});

bridge.on("ready", (addr) => {
    console.log(`🚀 [BCH Bridge] Grid online su ${addr}`);
});

bridge.on("debug", (msg) => {
    console.log(`🔍 [BCH Bridge] ${msg}`);
});

bridge.listen();
