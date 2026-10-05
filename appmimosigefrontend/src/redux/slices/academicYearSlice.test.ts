//academicYearSlice.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import academicYearReducer, {
    readSelectedAcademicYearId,
    selectedAcademicYearStorageKey,
    setSelectedAcademicYearId,
} from "./academicYearSlice";

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe("academicYearSlice", () => {
    it("starts with the choice kept in the browser", () => {
        localStorage.setItem(selectedAcademicYearStorageKey, "12");

        expect(academicYearReducer(undefined, { type: "init" })).toEqual({ selectedAcademicYearId: 12 });
    });

    it("starts without a choice when the browser has none", () => {
        expect(academicYearReducer(undefined, { type: "init" })).toEqual({ selectedAcademicYearId: null });
    });

    it("keeps a new choice in the browser", () => {
        const state = academicYearReducer(undefined, setSelectedAcademicYearId(10));

        expect(state.selectedAcademicYearId).toBe(10);
        expect(localStorage.getItem(selectedAcademicYearStorageKey)).toBe("10");
    });

    // choosing the current year removes the choice, so the default follows the calendar
    it("forgets a cleared choice", () => {
        localStorage.setItem(selectedAcademicYearStorageKey, "10");

        const state = academicYearReducer({ selectedAcademicYearId: 10 }, setSelectedAcademicYearId(null));

        expect(state.selectedAcademicYearId).toBeNull();
        expect(localStorage.getItem(selectedAcademicYearStorageKey)).toBeNull();
    });

    // without the browser storage the choice lives in this session only
    it("works without the browser storage", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        expect(academicYearReducer(undefined, setSelectedAcademicYearId(10)).selectedAcademicYearId).toBe(10);
    });
});

describe("readSelectedAcademicYearId", () => {
    it.each(["", "0", "-3", "1.5", "abc"])("ignores the stored value %j", (value) => {
        localStorage.setItem(selectedAcademicYearStorageKey, value);

        expect(readSelectedAcademicYearId()).toBeNull();
    });

    it("is empty when the browser storage cannot be read", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        expect(readSelectedAcademicYearId()).toBeNull();
    });
});
