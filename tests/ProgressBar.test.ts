import { describe, expect, it } from "bun:test";
import { ProgressBar } from "../src/utils/ProgressBar.ts";

describe("ProgressBar", () => {
    it("should render an empty progress bar at 0ms", () => {
        const bar = ProgressBar.create(0, 100000);
        expect(bar).toBeDefined();
        expect(typeof bar).toBe("string");
    });

    it("should render full progress bar when complete", () => {
        const bar = ProgressBar.create(100000, 100000);
        expect(bar).toBeDefined();
        expect(typeof bar).toBe("string");
    });

    it("should format inline progress with timestamps", () => {
        const inline = ProgressBar.createInline(30000, 120000);
        expect(inline).toContain("0:30");
        expect(inline).toContain("2:00");
    });

    it("should calculate percentage accurately", () => {
        const percentageBar = ProgressBar.createWithPercentage(50000, 100000);
        expect(percentageBar).toContain("50%");
    });
});
