//workHourForm.test.ts

import { describe, expect, it } from "vitest";
import { workHourData } from "../testUtils/workHoursTestStore";
import {
    isEndNotAfterStart,
    newWorkHourForm,
    nowDateTimeInputValue,
    withSeconds,
    workHourFormToRequest,
    workHourToForm,
} from "./workHourForm";

describe("workHourForm", () => {
    it("writes now to the second", () => {
        expect(nowDateTimeInputValue(new Date(2026, 9, 2, 9, 5, 7))).toBe("2026-10-02T09:05:07");
    });

    it("starts a new record now, without an end", () => {
        expect(newWorkHourForm("2026-10-02T09:05:07")).toEqual({
            teacherContractId: "",
            whStart: "2026-10-02T09:05:07",
            whEnd: "",
        });
        expect(newWorkHourForm("2026-10-02T09:05:07", "15").teacherContractId).toBe("15");
    });

    it("fills the form from a record", () => {
        expect(workHourToForm(workHourData())).toEqual({
            teacherContractId: "1",
            whStart: "2026-09-15T11:55:12",
            whEnd: "2026-09-15T18:05:00",
        });
    });

    it("fills an empty end for a record not ended yet", () => {
        expect(workHourToForm(workHourData({ whEnd: null })).whEnd).toBe("");
    });

    // the server writes the fraction of a second when there is one; the input takes whole seconds
    it("drops the fraction of a second the server sends", () => {
        const form = workHourToForm(
            workHourData({ whStart: "2026-09-15T11:55:12.997", whEnd: "2026-09-15T18:05:00.5" })
        );

        expect(form.whStart).toBe("2026-09-15T11:55:12");
        expect(form.whEnd).toBe("2026-09-15T18:05:00");
    });

    // the browser drops zero seconds from a datetime-local value
    it("adds the seconds the browser left out", () => {
        expect(withSeconds("2026-09-15T18:05")).toBe("2026-09-15T18:05:00");
        expect(withSeconds("2026-09-15T18:05:09")).toBe("2026-09-15T18:05:09");
        expect(withSeconds("2026-09-15T18:05:09.000")).toBe("2026-09-15T18:05:09");
    });

    it("builds the request", () => {
        expect(
            workHourFormToRequest({ teacherContractId: "15", whStart: "2026-09-15T11:55", whEnd: "2026-09-15T18:05:09" })
        ).toEqual({ teacherContractId: 15, whStart: "2026-09-15T11:55:00", whEnd: "2026-09-15T18:05:09" });
    });

    it("sends an empty end as null", () => {
        expect(
            workHourFormToRequest({ teacherContractId: "1", whStart: "2026-09-15T11:55:12", whEnd: "" }).whEnd
        ).toBeNull();
    });

    // the end must be after the start, the same moment written with or without seconds included
    it.each([
        ["2026-09-15T11:55:12", "2026-09-15T11:55:11", true],
        ["2026-09-15T11:55:12", "2026-09-15T11:55:12", true],
        ["2026-09-15T11:55", "2026-09-15T11:55:00", true],
        ["2026-09-15T11:55:00", "2026-09-15T11:55", true],
        ["2026-09-15T11:55:12", "2026-09-15T11:55:12.000", true],
        ["2026-09-15T11:55:12.000", "2026-09-15T11:55:13", false],
        ["2026-09-15T11:55:12", "2026-09-15T11:55:13", false],
        ["2026-09-15T11:55", "2026-09-15T11:56", false],
        ["2026-09-15T11:55:12", "", false],
        ["", "2026-09-15T11:55:12", false],
    ])("start %s, end %s: end not after start %s", (whStart, whEnd, expected) => {
        expect(isEndNotAfterStart({ teacherContractId: "1", whStart, whEnd })).toBe(expected);
    });
});
