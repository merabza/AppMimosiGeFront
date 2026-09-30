//studentContractsListFilter.test.ts

import { describe, expect, it } from "vitest";
import { buildFilterFields } from "./studentContractsListFilter";
import {
    formatDate,
    formatDateTime,
    toDateInputValue,
    todayDateInputValue,
} from "./dateFormat";

describe("buildFilterFields", () => {
    it("sends only the filters that have a value", () => {
        expect(buildFilterFields("11", "", "  ბერი ")).toEqual([
            { fieldName: "academicYearId", value: "11" },
            { fieldName: "search", value: "ბერი" },
        ]);
    });

    it("sends nothing when no filter is set", () => {
        expect(buildFilterFields("", "", "   ")).toEqual([]);
    });

    it("sends the status filter", () => {
        expect(buildFilterFields("", "3", "")).toEqual([
            { fieldName: "studentStatusId", value: "3" },
        ]);
    });
});

describe("dateFormat", () => {
    it("formats API dates without time zone shifts", () => {
        expect(formatDate("2026-09-15T00:00:00")).toBe("15.09.2026");
        expect(formatDateTime("2026-10-01T16:30:00")).toBe("01.10.2026 16:30");
        expect(formatDateTime("2026-10-01")).toBe("01.10.2026");
        expect(toDateInputValue("2026-09-15T00:00:00")).toBe("2026-09-15");
    });

    it("handles missing values", () => {
        expect(formatDate(null)).toBe("");
        expect(formatDateTime(undefined)).toBe("");
        expect(toDateInputValue(null)).toBe("");
    });

    it("builds today's date input value with padding", () => {
        expect(todayDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
});
