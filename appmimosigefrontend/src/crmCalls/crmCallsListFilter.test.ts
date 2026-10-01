//crmCallsListFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    buildCrmCallsFilterFields,
    contractCrmCallsUrl,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    shortenText,
    type ICrmCallsListFilter,
} from "./crmCallsListFilter";

const emptyFilter: ICrmCallsListFilter = {
    academicYearId: "",
    studentContractId: "",
    dateFrom: "",
    dateTo: "",
    callTypeId: "",
    answerTypeId: "",
};

describe("crmCallsListFilter", () => {
    // Access listed every call: no default filter
    it("has no filter without parameters", () => {
        expect(filterFromSearchParams(new URLSearchParams())).toEqual(emptyFilter);
    });

    it("reads every key from the address", () => {
        expect(
            filterFromSearchParams(
                new URLSearchParams(
                    "academicYearId=10&studentContractId=12&dateFrom=2026-09-01&dateTo=2026-09-30&callTypeId=1&answerTypeId=3"
                )
            )
        ).toEqual({
            academicYearId: "10",
            studentContractId: "12",
            dateFrom: "2026-09-01",
            dateTo: "2026-09-30",
            callTypeId: "1",
            answerTypeId: "3",
        });
    });

    it("writes only the set keys to the address and reads them back", () => {
        const filter = { ...emptyFilter, studentContractId: "12", answerTypeId: "3" };

        const params = filterToSearchParams(filter);

        expect(params.toString()).toBe("studentContractId=12&answerTypeId=3");
        expect(filterFromSearchParams(params)).toEqual(filter);
    });

    it("links to every call of a contract", () => {
        expect(contractCrmCallsUrl(10, 11)).toBe("/crmCalls?academicYearId=11&studentContractId=10");
    });

    it("sends only the set filters to the server, by its names", () => {
        expect(buildCrmCallsFilterFields(emptyFilter)).toEqual([]);
        expect(
            buildCrmCallsFilterFields({
                academicYearId: "10",
                studentContractId: "12",
                dateFrom: "2026-09-01",
                dateTo: "2026-09-30",
                callTypeId: "1",
                answerTypeId: "3",
            })
        ).toEqual([
            { fieldName: "studentContractId", value: "12" },
            { fieldName: "dateFrom", value: "2026-09-01" },
            { fieldName: "dateTo", value: "2026-09-30" },
            { fieldName: "callTypeId", value: "1" },
            { fieldName: "answerTypeId", value: "3" },
        ]);
    });

    it("finds a reversed range only when both ends are set", () => {
        expect(isDateRangeInvalid({ ...emptyFilter, dateFrom: "2026-09-30", dateTo: "2026-09-01" })).toBe(true);
        expect(isDateRangeInvalid({ ...emptyFilter, dateFrom: "2026-09-01", dateTo: "2026-09-01" })).toBe(false);
        expect(isDateRangeInvalid({ ...emptyFilter, dateFrom: "2026-09-30" })).toBe(false);
        expect(isDateRangeInvalid({ ...emptyFilter, dateTo: "2026-09-01" })).toBe(false);
    });

    it("shortens a long conversation to one line", () => {
        expect(shortenText("short")).toBe("short");
        expect(shortenText("  two\n lines  ")).toBe("two lines");
        expect(shortenText("a".repeat(60))).toBe("a".repeat(60));
        expect(shortenText("a".repeat(61))).toBe(`${"a".repeat(59)}…`);
        expect(shortenText("abcdef", 4)).toBe("abc…");
    });

    it("shortens nothing to an empty text", () => {
        expect(shortenText(null)).toBe("");
        expect(shortenText(undefined)).toBe("");
    });
});
