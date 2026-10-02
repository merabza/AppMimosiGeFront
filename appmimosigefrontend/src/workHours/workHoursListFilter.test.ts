//workHoursListFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    buildWorkHoursFilterFields,
    canAutoGenerate,
    filterFromSearchParams,
    filterToSearchParams,
    formatHours,
    isDateRangeInvalid,
    luftToRequest,
} from "./workHoursListFilter";

const now = new Date(2026, 9, 2, 9, 30);

describe("filterFromSearchParams", () => {
    // Access: from the 1st of the current month until today
    it("defaults to the current month until today without parameters", () => {
        expect(filterFromSearchParams(new URLSearchParams(), now)).toEqual({
            teacherContractId: "",
            dateFrom: "2026-10-01",
            dateTo: "2026-10-02",
        });
    });

    it("reads the filter from the parameters", () => {
        expect(
            filterFromSearchParams(
                new URLSearchParams("teacherContractId=15&dateFrom=2026-09-01&dateTo=2026-09-30"),
                now
            )
        ).toEqual({ teacherContractId: "15", dateFrom: "2026-09-01", dateTo: "2026-09-30" });
    });

    // one parameter is enough for a filter: the missing ones are empty, not the default month
    it.each([
        ["teacherContractId=15", { teacherContractId: "15", dateFrom: "", dateTo: "" }],
        ["dateFrom=", { teacherContractId: "", dateFrom: "", dateTo: "" }],
        ["dateTo=2026-09-30", { teacherContractId: "", dateFrom: "", dateTo: "2026-09-30" }],
    ])("keeps empty values when only %s is given", (query, expected) => {
        expect(filterFromSearchParams(new URLSearchParams(query), now)).toEqual(expected);
    });
});

describe("filterToSearchParams", () => {
    it("writes every key, also the empty ones", () => {
        expect(
            filterToSearchParams({ teacherContractId: "", dateFrom: "2026-09-01", dateTo: "" }).toString()
        ).toBe("teacherContractId=&dateFrom=2026-09-01&dateTo=");
    });

    it("round-trips through the parameters", () => {
        const filter = { teacherContractId: "5", dateFrom: "2026-09-01", dateTo: "2026-09-30" };
        expect(filterFromSearchParams(filterToSearchParams(filter), now)).toEqual(filter);
    });
});

describe("buildWorkHoursFilterFields", () => {
    it("sends the filled values with the server's names", () => {
        expect(
            buildWorkHoursFilterFields({ teacherContractId: "15", dateFrom: "2026-09-01", dateTo: "2026-09-30" })
        ).toEqual([
            { fieldName: "teacherContractId", value: "15" },
            { fieldName: "dateFrom", value: "2026-09-01" },
            { fieldName: "dateTo", value: "2026-09-30" },
        ]);
    });

    it("leaves out the empty values", () => {
        expect(buildWorkHoursFilterFields({ teacherContractId: "", dateFrom: "", dateTo: "2026-09-30" })).toEqual([
            { fieldName: "dateTo", value: "2026-09-30" },
        ]);
    });
});

describe("isDateRangeInvalid and canAutoGenerate", () => {
    it.each([
        ["2026-09-02", "2026-09-01", true, false],
        ["2026-09-01", "2026-09-01", false, true],
        ["2026-09-01", "2026-09-30", false, true],
        ["", "2026-09-30", false, false],
        ["2026-09-01", "", false, false],
        ["", "", false, false],
    ])("from %s until %s: invalid %s, can generate %s", (dateFrom, dateTo, invalid, generate) => {
        const filter = { teacherContractId: "", dateFrom, dateTo };
        expect(isDateRangeInvalid(filter)).toBe(invalid);
        expect(canAutoGenerate(filter)).toBe(generate);
    });
});

describe("formatHours", () => {
    it.each([
        [6.1667, "6.17"],
        [2, "2.00"],
        [0, "0.00"],
        [null, ""],
        [undefined, ""],
        ["", ""],
    ])("%s is shown as '%s'", (value, expected) => {
        expect(formatHours(value)).toBe(expected);
    });
});

describe("luftToRequest", () => {
    // an empty luft is Access's Nz(txtLuft, 0): the server takes null as 0
    it.each([
        ["5", 5],
        ["", null],
        ["  ", null],
        ["-3", -3],
        ["2.7", 2],
        ["31", 31],
    ])("'%s' is sent as %s", (luft, expected) => {
        expect(luftToRequest(luft)).toBe(expected);
    });
});
