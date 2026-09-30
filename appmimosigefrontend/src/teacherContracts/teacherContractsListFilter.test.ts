//teacherContractsListFilter.test.ts

import { describe, expect, it } from "vitest";
import { buildFilterFields } from "./teacherContractsListFilter";

describe("buildFilterFields", () => {
    it("sends the active filter and the trimmed search", () => {
        expect(buildFilterFields(true, "  T3. ")).toEqual([
            { fieldName: "activeOnly", value: "true" },
            { fieldName: "search", value: "T3." },
        ]);
    });

    it("sends nothing for all contracts without a search", () => {
        expect(buildFilterFields(false, "   ")).toEqual([]);
    });

    it("sends only the search for all contracts", () => {
        expect(buildFilterFields(false, "ალფა")).toEqual([
            { fieldName: "search", value: "ალფა" },
        ]);
    });
});
