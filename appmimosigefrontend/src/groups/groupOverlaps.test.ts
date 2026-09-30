//groupOverlaps.test.ts

import { describe, expect, it } from "vitest";
import type { IDayTimePlaceFormRow, ITeacherFormRow } from "./groupForm";
import {
    overlappingDayTimePlaceKeys,
    overlappingTeacherKeys,
    periodsOverlap,
} from "./groupOverlaps";

function teacher(key: number, startDate: string, endDate = ""): ITeacherFormRow {
    return { key, id: 0, teacherContractId: "5", salarySchemaId: "8", startDate, endDate };
}

function dayTimePlace(
    key: number,
    weekDayId: string,
    startDate: string,
    endDate = ""
): IDayTimePlaceFormRow {
    return {
        key,
        id: 0,
        weekDayId,
        lessonStartTimeId: "17",
        hoursCount: "1.5",
        roomId: "2",
        startDate,
        endDate,
    };
}

describe("periodsOverlap", () => {
    it.each([
        ["2026-09-01", "2026-09-10", "2026-09-05", "2026-09-20", true],
        // the end day is not in the period any more
        ["2026-09-01", "2026-09-10", "2026-09-10", "2026-09-20", false],
        ["2026-09-10", "2026-09-20", "2026-09-01", "2026-09-10", false],
        ["2026-09-01", "2026-09-30", "2026-09-05", "2026-09-06", true],
        // an empty end is an open period
        ["2026-09-01", "", "2026-12-01", "2026-12-02", true],
        ["2026-09-01", "2026-09-10", "2026-09-10", "", false],
        ["2026-09-01", "", "2027-01-01", "", true],
        // a row without a start is not compared (it is a required field error)
        ["", "", "2026-09-01", "", false],
        ["2026-09-01", "", "", "", false],
    ])("[%s, %s) and [%s, %s) overlap: %s", (start1, end1, start2, end2, expected) => {
        expect(periodsOverlap(start1, end1, start2, end2)).toBe(expected);
    });
});

describe("overlappingTeacherKeys", () => {
    it("is empty for consecutive periods", () => {
        expect(
            overlappingTeacherKeys([
                teacher(1, "2026-09-01", "2026-09-20"),
                teacher(2, "2026-09-20", "2026-10-01"),
                teacher(3, "2026-10-01"),
            ]).size
        ).toBe(0);
    });

    // generator error 5: two teachers on one day
    it("marks both rows of every overlapping pair", () => {
        expect([
            ...overlappingTeacherKeys([
                teacher(1, "2026-09-01", "2026-09-20"),
                teacher(2, "2026-09-20"),
                teacher(3, "2026-09-15", "2026-09-16"),
            ]),
        ].sort()).toEqual([1, 3]);
    });
});

describe("overlappingDayTimePlaceKeys", () => {
    it("compares only rows of the same week day", () => {
        expect(
            overlappingDayTimePlaceKeys([
                dayTimePlace(1, "1", "2026-09-01"),
                dayTimePlace(2, "2", "2026-09-01"),
                dayTimePlace(3, "1", "2026-08-01", "2026-09-01"),
            ]).size
        ).toBe(0);
    });

    // generator error 7: two schedules on one week day
    it("marks the rows of one week day whose periods overlap", () => {
        expect([
            ...overlappingDayTimePlaceKeys([
                dayTimePlace(1, "3", "2026-09-01"),
                dayTimePlace(2, "4", "2026-09-01"),
                dayTimePlace(3, "3", "2026-09-15", "2026-09-30"),
            ]),
        ].sort()).toEqual([1, 3]);
    });

    it("does not compare rows without a week day", () => {
        expect(
            overlappingDayTimePlaceKeys([
                dayTimePlace(1, "", "2026-09-01"),
                dayTimePlace(2, "", "2026-09-01"),
            ]).size
        ).toBe(0);
    });
});
