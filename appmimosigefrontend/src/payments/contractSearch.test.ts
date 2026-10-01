//contractSearch.test.ts

import { describe, expect, it } from "vitest";
import { matchesSearch } from "./contractSearch";

describe("matchesSearch", () => {
    it.each([
        ["", true],
        ["   ", true],
        ["Alpha", true],
        ["alpha", true],
        ["ann alpha", true],
        ["6.001", true],
        ["ALPHA  6.0", true],
        ["Beta", false],
        ["alpha bob", false],
        ["6.002", false],
    ])("finds 'Alpha Ann 6.001' by '%s': %s", (search, expected) => {
        expect(matchesSearch("Alpha Ann 6.001", search)).toBe(expected);
    });

    it("finds Georgian names by any of their words", () => {
        expect(matchesSearch("ბერიძე ანა 6.001", "ანა ბერი")).toBe(true);
        expect(matchesSearch("ბერიძე ანა 6.001", "ნინო")).toBe(false);
    });
});
