//lessonsListFilter.test.ts

import { describe, expect, it } from "vitest";
import {
    buildLessonsFilterFields,
    currentMonth,
    currentWeek,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    type ILessonsListFilter,
} from "./lessonsListFilter";

// Thursday, 1 October 2026
const now = new Date(2026, 9, 1, 13, 30);

const emptyFilter: ILessonsListFilter = {
    grpId: "",
    teacherContractId: "",
    dateFrom: "",
    dateTo: "",
    lessonStatusId: "",
    unfilled: false,
};

describe("currentWeek", () => {
    it("is Monday to Sunday", () => {
        expect(currentWeek(now)).toEqual({ dateFrom: "2026-09-28", dateTo: "2026-10-04" });
    });

    it("on Monday starts that day and on Sunday ends that day", () => {
        expect(currentWeek(new Date(2026, 8, 28))).toEqual({
            dateFrom: "2026-09-28",
            dateTo: "2026-10-04",
        });
        expect(currentWeek(new Date(2026, 9, 4, 23, 59))).toEqual({
            dateFrom: "2026-09-28",
            dateTo: "2026-10-04",
        });
    });
});

describe("currentMonth", () => {
    it("is the first to the last day of the month", () => {
        expect(currentMonth(now)).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-31" });
        expect(currentMonth(new Date(2027, 1, 10))).toEqual({
            dateFrom: "2027-02-01",
            dateTo: "2027-02-28",
        });
    });
});

describe("filterFromSearchParams", () => {
    it("without filter parameters is the current week", () => {
        expect(filterFromSearchParams(new URLSearchParams(), now)).toEqual({
            ...emptyFilter,
            dateFrom: "2026-09-28",
            dateTo: "2026-10-04",
        });
        expect(filterFromSearchParams(new URLSearchParams("other=1"), now).dateFrom).toBe(
            "2026-09-28"
        );
    });

    it("reads the parameters, a missing one is empty", () => {
        expect(
            filterFromSearchParams(
                new URLSearchParams(
                    "grpId=7&teacherContractId=3&dateFrom=2026-09-01&lessonStatusId=2&unfilled=true"
                ),
                now
            )
        ).toEqual({
            grpId: "7",
            teacherContractId: "3",
            dateFrom: "2026-09-01",
            dateTo: "",
            lessonStatusId: "2",
            unfilled: true,
        });
    });

    // one filter parameter is enough to leave the default week; the missing ones are empty
    it("with one filter parameter leaves the others empty", () => {
        expect(filterFromSearchParams(new URLSearchParams("teacherContractId=3"), now)).toEqual({
            ...emptyFilter,
            teacherContractId: "3",
        });
    });

    // the group page link: all the group's lessons, no dates
    it("an empty date parameter stays empty", () => {
        expect(
            filterFromSearchParams(new URLSearchParams("grpId=7&dateFrom=&dateTo="), now)
        ).toEqual({ ...emptyFilter, grpId: "7" });
    });

    it.each(["false", "", "1"])("unfilled=%s is not the unfilled filter", (value) => {
        expect(
            filterFromSearchParams(new URLSearchParams(`unfilled=${value}`), now).unfilled
        ).toBe(false);
    });
});

describe("filterToSearchParams", () => {
    it("writes every key, the empty ones too, and reads back the same filter", () => {
        const filter = { ...emptyFilter, grpId: "7", unfilled: true };

        const params = filterToSearchParams(filter);

        expect(params.toString()).toBe(
            "grpId=7&teacherContractId=&dateFrom=&dateTo=&lessonStatusId=&unfilled=true"
        );
        expect(filterFromSearchParams(params, now)).toEqual(filter);
    });

    it("writes unfilled false as empty", () => {
        expect(filterToSearchParams(emptyFilter).get("unfilled")).toBe("");
    });
});

describe("buildLessonsFilterFields", () => {
    it("sends the filled filters with the backend names", () => {
        expect(
            buildLessonsFilterFields({
                grpId: "7",
                teacherContractId: "3",
                dateFrom: "2026-09-28",
                dateTo: "2026-10-04",
                lessonStatusId: "2",
                unfilled: true,
            })
        ).toEqual([
            { fieldName: "grpId", value: "7" },
            { fieldName: "teacherContractId", value: "3" },
            { fieldName: "dateFrom", value: "2026-09-28" },
            { fieldName: "dateTo", value: "2026-10-04" },
            { fieldName: "lessonStatusId", value: "2" },
            { fieldName: "unfilled", value: "true" },
        ]);
    });

    it("leaves out the empty ones", () => {
        expect(buildLessonsFilterFields(emptyFilter)).toEqual([]);
    });
});

describe("isDateRangeInvalid", () => {
    it.each([
        ["2026-10-02", "2026-10-01", true],
        ["2026-10-01", "2026-10-01", false],
        ["2026-09-30", "2026-10-01", false],
        ["", "2026-10-01", false],
        ["2026-10-02", "", false],
    ])("from %s to %s: %s", (dateFrom, dateTo, expected) => {
        expect(isDateRangeInvalid({ ...emptyFilter, dateFrom, dateTo })).toBe(expected);
    });
});
