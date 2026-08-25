import { describe, expect, it } from "bun:test";
import { LocalizationService } from "../src/services/LocalizationService.ts";

describe("LocalizationService", () => {
    const loc = LocalizationService.getInstance();

    it("should return Italian translation by default", () => {
        const text = loc.get("common.nobody", "it");
        expect(text).toBeDefined();
        expect(typeof text).toBe("string");
    });

    it("should return English translation when specified", () => {
        const text = loc.get("common.nobody", "en");
        expect(text).toBeDefined();
        expect(typeof text).toBe("string");
    });

    it("should interpolate arguments correctly", () => {
        const text = loc.get("messages.search_added", "it", { query: "Daft Punk" });
        expect(text).toContain("Daft Punk");
    });

    it("should fallback gracefully on missing key", () => {
        const fallback = loc.get("non_existent_key_xyz", "it");
        expect(fallback).toBe("non_existent_key_xyz");
    });
});
