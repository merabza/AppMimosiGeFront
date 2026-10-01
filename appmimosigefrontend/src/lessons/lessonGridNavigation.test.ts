//lessonGridNavigation.test.ts

import { describe, expect, it } from "vitest";
import { cellKey, parseCellKey, targetCell } from "./lessonGridNavigation";

describe("cellKey and parseCellKey", () => {
    it("write and read row-column", () => {
        expect(cellKey({ row: 2, column: 5 })).toBe("2-5");
        expect(parseCellKey("2-5")).toEqual({ row: 2, column: 5 });
    });

    // a class has fewer than 10 students, but the grid works for any size
    it("reads numbers of several digits", () => {
        expect(parseCellKey(cellKey({ row: 12, column: 30 }))).toEqual({ row: 12, column: 30 });
    });

    it.each([undefined, "", "2", "a-1", "1-2-3", "-1-2"])(
        "reads %s as no cell",
        (value) => {
            expect(parseCellKey(value)).toBeNull();
        }
    );
});

describe("targetCell", () => {
    const cell = { row: 1, column: 3 };

    it.each([
        ["ArrowDown", false, { row: 2, column: 3 }],
        ["Enter", false, { row: 2, column: 3 }],
        ["ArrowUp", false, { row: 0, column: 3 }],
        ["Enter", true, { row: 0, column: 3 }],
        ["ArrowDown", true, { row: 2, column: 3 }],
    ])("%s (shift %s) moves in the same column", (key, shiftKey, expected) => {
        expect(targetCell(cell, key, shiftKey, 3)).toEqual(expected);
    });

    it.each(["ArrowLeft", "ArrowRight", "Tab", "a", " "])(
        "%s is not a grid move",
        (key) => {
            expect(targetCell(cell, key, false, 3)).toBeNull();
        }
    );

    it("stops at the first and the last row", () => {
        expect(targetCell({ row: 0, column: 0 }, "ArrowUp", false, 3)).toBeNull();
        expect(targetCell({ row: 0, column: 0 }, "Enter", true, 3)).toBeNull();
        expect(targetCell({ row: 2, column: 0 }, "ArrowDown", false, 3)).toBeNull();
        expect(targetCell({ row: 2, column: 0 }, "Enter", false, 3)).toBeNull();
    });
});
