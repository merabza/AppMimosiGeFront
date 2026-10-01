//paymentsListFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    buildPaymentsFilterFields,
    currentMonthToDate,
    filterFromSearchParams,
    filterToSearchParams,
    formatAmount,
    isDateRangeInvalid,
    type IPaymentsListFilter,
} from "./paymentsListFilter";

const filter: IPaymentsListFilter = {
    academicYearId: "10",
    studentContractId: "12",
    bankAccountId: "4",
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
};

describe("currentMonthToDate", () => {
    // Access: from the first day of the month until today
    it("runs from the first day of the month to today", () => {
        expect(currentMonthToDate(new Date(2026, 9, 17, 23, 59))).toEqual({
            dateFrom: "2026-10-01",
            dateTo: "2026-10-17",
        });
    });

    it("is one day on the first of the month", () => {
        expect(currentMonthToDate(new Date(2026, 0, 1))).toEqual({
            dateFrom: "2026-01-01",
            dateTo: "2026-01-01",
        });
    });
});

describe("filterFromSearchParams", () => {
    it("defaults to this month until today without parameters", () => {
        expect(filterFromSearchParams(new URLSearchParams(), new Date(2026, 9, 5))).toEqual({
            academicYearId: "",
            studentContractId: "",
            bankAccountId: "",
            dateFrom: "2026-10-01",
            dateTo: "2026-10-05",
        });
    });

    it("reads every key from the address", () => {
        expect(filterFromSearchParams(filterToSearchParams(filter))).toEqual(filter);
    });

    // any key means the filter was set: missing ones are empty, the dates are no longer defaulted
    it.each(["academicYearId", "studentContractId", "bankAccountId", "dateFrom", "dateTo"])(
        "takes a filter with only %s as it is",
        (key) => {
            const result = filterFromSearchParams(new URLSearchParams({ [key]: "7" }));
            expect(result).toEqual({
                academicYearId: "",
                studentContractId: "",
                bankAccountId: "",
                dateFrom: "",
                dateTo: "",
                [key]: "7",
            });
        }
    );
});

describe("filterToSearchParams", () => {
    // a cleared date is kept as an empty key, so the default month does not come back
    it("writes every key, the empty ones too", () => {
        expect(
            filterToSearchParams({ ...filter, studentContractId: "", dateFrom: "", dateTo: "" }).toString()
        ).toBe("academicYearId=10&studentContractId=&bankAccountId=4&dateFrom=&dateTo=");
    });
});

describe("buildPaymentsFilterFields", () => {
    // the academic year only narrows the student list, it does not filter the payments
    it("sends the contract, the bank and the dates", () => {
        expect(buildPaymentsFilterFields(filter)).toEqual([
            { fieldName: "studentContractId", value: "12" },
            { fieldName: "bankAccountId", value: "4" },
            { fieldName: "dateFrom", value: "2026-09-01" },
            { fieldName: "dateTo", value: "2026-09-30" },
        ]);
    });

    it("leaves the empty values out", () => {
        expect(
            buildPaymentsFilterFields({
                academicYearId: "10",
                studentContractId: "",
                bankAccountId: "",
                dateFrom: "",
                dateTo: "2026-09-30",
            })
        ).toEqual([{ fieldName: "dateTo", value: "2026-09-30" }]);
    });
});

describe("isDateRangeInvalid", () => {
    it.each([
        ["2026-09-02", "2026-09-01", true],
        ["2026-09-01", "2026-09-01", false],
        ["2026-09-01", "2026-09-02", false],
        ["2026-09-02", "", false],
        ["", "2026-09-01", false],
    ])("from %s to %s is invalid: %s", (dateFrom, dateTo, expected) => {
        expect(isDateRangeInvalid({ ...filter, dateFrom, dateTo })).toBe(expected);
    });
});

describe("formatAmount", () => {
    it.each([
        [300, "300.00"],
        [10728.75, "10728.75"],
        [-20.5, "-20.50"],
        [0, "0.00"],
        ["12.5", "12.50"],
        [null, ""],
        [undefined, ""],
        ["", ""],
    ])("shows %s as %s", (value, expected) => {
        expect(formatAmount(value)).toBe(expected);
    });
});
