//statementFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    buildStatementFilterFields,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    previousMonthToDate,
    statementUrl,
    type IStatementFilter,
} from "./statementFilter";

const now = new Date(2026, 9, 1, 17, 30);

const filter = (changes: Partial<IStatementFilter> = {}): IStatementFilter => ({
    academicYearId: "",
    studentContractId: "",
    dateFrom: "",
    dateTo: "",
    ...changes,
});

describe("previousMonthToDate", () => {
    // Access: DateAdd("m", -1, DateSerial(Year(Date()), Month(Date()), 1)) until the end of today
    it("is from the first day of the previous month until today", () => {
        expect(previousMonthToDate(now)).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-10-01" });
    });

    it("goes back over the year end in January", () => {
        expect(previousMonthToDate(new Date(2027, 0, 20))).toEqual({
            dateFrom: "2026-12-01",
            dateTo: "2027-01-20",
        });
    });
});

describe("filterFromSearchParams", () => {
    it("without parameters is every student from the previous month until today", () => {
        expect(filterFromSearchParams(new URLSearchParams(), now)).toEqual(
            filter({ dateFrom: "2026-09-01", dateTo: "2026-10-01" })
        );
    });

    it("reads the given parameters and leaves the missing ones empty", () => {
        expect(
            filterFromSearchParams(new URLSearchParams("studentContractId=35&dateTo=2026-10-31"), now)
        ).toEqual(filter({ studentContractId: "35", dateTo: "2026-10-31" }));
    });

    // an emptied date stays empty: it does not bring the default back
    it("keeps empty values when any key is there", () => {
        expect(filterFromSearchParams(new URLSearchParams("dateFrom="), now)).toEqual(filter());
    });

    it("reads the academic year of the student picker", () => {
        expect(filterFromSearchParams(new URLSearchParams("academicYearId=10"), now).academicYearId).toBe("10");
    });
});

describe("filterToSearchParams", () => {
    it("writes every key, the empty ones too", () => {
        expect(
            filterToSearchParams(filter({ academicYearId: "11", studentContractId: "35", dateTo: "2026-10-31" }))
                .toString()
        ).toBe("academicYearId=11&studentContractId=35&dateFrom=&dateTo=2026-10-31");
    });
});

describe("buildStatementFilterFields", () => {
    it("sends only the set filters with the backend names", () => {
        expect(
            buildStatementFilterFields(
                filter({ academicYearId: "11", studentContractId: "35", dateFrom: "2026-09-01", dateTo: "" })
            )
        ).toEqual([
            { fieldName: "studentContractId", value: "35" },
            { fieldName: "dateFrom", value: "2026-09-01" },
        ]);
    });

    it("sends nothing without filters", () => {
        expect(buildStatementFilterFields(filter())).toEqual([]);
    });
});

describe("isDateRangeInvalid", () => {
    it.each([
        ["2026-09-02", "2026-09-01", true],
        ["2026-09-01", "2026-09-01", false],
        ["2026-09-01", "2026-09-02", false],
        ["", "2026-09-01", false],
        ["2026-09-01", "", false],
        ["", "", false],
    ])("from %s to %s is invalid: %s", (dateFrom, dateTo, expected) => {
        expect(isDateRangeInvalid(filter({ dateFrom, dateTo }))).toBe(expected);
    });
});

describe("statementUrl", () => {
    // Access opened the statement with the contract and the deposits' "date to"; "date from" kept its default
    it("opens the contract's statement from the previous month until the given date", () => {
        expect(statementUrl(35, 11, "2026-10-06", now)).toBe(
            "/chargesAndPayments?academicYearId=11&studentContractId=35&dateFrom=2026-09-01&dateTo=2026-10-06"
        );
    });
});
