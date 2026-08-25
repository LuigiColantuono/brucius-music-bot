import * as status from "./info/status.ts";
import * as reload from "./reload.ts";
import * as setup from "./setup.ts";

export const commands = [setup, reload, status];

// Verifica che ogni comando abbia .data e .execute
console.log("Comandi disponibili:");
commands.forEach((cmd) => {
    console.log(`  • ${cmd.data.name}: ${cmd.data.description}`);
});
