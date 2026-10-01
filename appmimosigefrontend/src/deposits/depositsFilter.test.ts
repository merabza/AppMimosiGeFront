//depositsFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    allAcademicYears,
    defaultDateTo,
    filterFromSearchParams,
    filterToSearchParams,
    formatPhone,
    toDepositsRequest,
    type IDepositsFilter,
} from "./depositsFilter";

const now = new Date(2026, 9, 1, 17, 30);

const filter = (changes: Partial<IDepositsFilter> = {}): IDepositsFilter => ({
    academicYearId: "",
    maximum: "0",
    dateTo: "2026-10-06",
    filter: "",
    ...changes,
});

describe("defaultDateTo", () => {
    // Access: DateAdd("s", -1, DateAdd("d", 6, Date())), the end of today + 5 days
    it("is five days after today", () => {
        expect(defaultDateTo(now)).toBe("2026-10-06");
    });

    it("goes over the month end", () => {
        expect(defaultDateTo(new Date(2026, 9, 29))).toBe("2026-11-03");
    });
});

describe("filterFromSearchParams", () => {
    it("without parameters is the current year, maximum 0, five days ahead, no filter", () => {
        expect(filterFromSearchParams(new URLSearchParams(), now)).toEqual(filter());
    });

    it("reads the given parameters", () => {
        expect(
            filterFromSearchParams(
                new URLSearchParams("academicYearId=all&maximum=-50.5&dateTo=2026-10-31&filter=call"),
                now
            )
        ).toEqual(filter({ academicYearId: "all", maximum: "-50.5", dateTo: "2026-10-31", filter: "call" }));
    });

    it("takes the filter button", () => {
        expect(filterFromSearchParams(new URLSearchParams("filter=filter"), now).filter).toBe("filter");
    });

    it("drops an unknown filter", () => {
        expect(filterFromSearchParams(new URLSearchParams("filter=other"), now).filter).toBe("");
    });

    it("keeps an emptied maximum", () => {
        expect(filterFromSearchParams(new URLSearchParams("maximum="), now).maximum).toBe("");
    });
});

describe("filterToSearchParams", () => {
    it("writes every key", () => {
        expect(filterToSearchParams(filter({ academicYearId: "10", filter: "filter" })).toString()).toBe(
            "academicYearId=10&maximum=0&dateTo=2026-10-06&filter=filter"
        );
    });
});

describe("toDepositsRequest", () => {
    it("takes the current year for an empty one", () => {
        expect(toDepositsRequest(filter(), 11)).toEqual({
            academicYearId: "11",
            maximum: "0",
            dateTo: "2026-10-06",
            filter: "",
        });
    });

    it("sends no year when there is no current one", () => {
        expect(toDepositsRequest(filter(), null).academicYearId).toBe("");
    });

    it("sends no year for all years", () => {
        expect(toDepositsRequest(filter({ academicYearId: allAcademicYears }), 11).academicYearId).toBe("");
    });

    it("keeps a chosen year, the maximum, the date and the filter", () => {
        expect(
            toDepositsRequest(filter({ academicYearId: "10", maximum: "-20", dateTo: "2027-06-30", filter: "call" }), 11)
        ).toEqual({ academicYearId: "10", maximum: "-20", dateTo: "2027-06-30", filter: "call" });
    });

    it("sends 0 for an empty maximum", () => {
        expect(toDepositsRequest(filter({ maximum: "" }), 11).maximum).toBe("0");
    });
});

describe("formatPhone", () => {
    // the Access format "000-00-00-00"
    it("groups nine digits", () => {
        expect(formatPhone("555123456")).toBe("555-12-34-56");
    });

    it.each([
        [null, ""],
        ["", ""],
        ["32123456", "32123456"],
        ["5551234567", "5551234567"],
        ["555 12 34 56", "555 12 34 56"],
    ])("leaves %s as %s", (phone, expected) => {
        expect(formatPhone(phone)).toBe(expected);
    });
});
