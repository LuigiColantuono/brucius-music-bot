import * as interactionCreate from "./interactionCreate.ts";
import * as messageCreate from "./messageCreate.ts";
import * as ready from "./ready.ts";

export const events = [ready, interactionCreate, messageCreate];

export { interactionCreate, messageCreate, ready };
