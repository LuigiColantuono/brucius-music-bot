import { spawn } from "bun";
import Ui from "./utils/Ui.ts";

/**
 * 🚀 BRUCIUS ENTERPRISE LAUNCHER
 * Avvia automaticamente sia il Bridge che il Bot nello stesso terminale.
 */

console.log(
    Ui.bold(Ui.hex("#FF6BFF")("\n 🎵 BRUCIUS ENTERPRISE GRID LAUNCHER \n")),
);

console.log(Ui.cyan("📡 Avvio del Bridge..."));
const bridge = spawn(["bun", "run", "src/server.ts"], {
    stdout: "inherit",
    stderr: "inherit",
});

console.log(Ui.cyan("🤖 Avvio del Bot ShardManager..."));
const bot = spawn(["bun", "run", "src/main.ts"], {
    stdout: "inherit",
    stderr: "inherit",
});

// Gestione dell'arresto (Ctrl+C o Dokploy/Docker SIGTERM)
const shutdown = () => {
    console.log(Ui.yellow("\n\n🛑 Spegnimento della Griglia in corso..."));
    bridge.kill();
    bot.kill();
    process.exit();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Se uno dei due processi muore, chiudi tutto per sicurezza
bridge.exited.then((code) => {
    if (code !== 0)
        console.log(Ui.red(`\n❌ Il Bridge si è fermato (Codice: ${code})`));
    bot.kill();
    process.exit(code || 0);
});

bot.exited.then((code) => {
    if (code !== 0)
        console.log(Ui.red(`\n❌ Il Bot si è fermato (Codice: ${code})`));
    bridge.kill();
    process.exit(code || 0);
});
