//newAcademicYearWizard.test.ts

import { describe, expect, it } from "vitest";
import { closeGroup, closeResult, yearInfo } from "../testUtils/academicYearTestStore";
import { closeGroupsTotals, defaultYearToClose } from "./newAcademicYearWizard";

describe("defaultYearToClose", () => {
    // the wizard first adds the new year, then closes the one before it
    it("is the year before the last one", () => {
        expect(defaultYearToClose([yearInfo(12, 2027), yearInfo(10, 2025), yearInfo(11, 2026)])?.ayId).toBe(11);
    });

    it("is the only year", () => {
        expect(defaultYearToClose([yearInfo(11, 2026)])?.ayId).toBe(11);
    });

    it("is none without years", () => {
        expect(defaultYearToClose([])).toBeUndefined();
    });
});

describe("closeGroupsTotals", () => {
    it("sums the groups, the deleted and kept lessons, the charges and the open rows", () => {
        const second = closeGroup(42, { deletedLessonsCharges: -18, openStudentRowsCount: 0 });
        second.generation = { ...second.generation, deletedLessonsCount: 2, errors: [] };

        expect(closeGroupsTotals(closeResult(true, [closeGroup(41), second]))).toEqual({
            groupsCount: 2,
            deletedLessonsCount: 3,
            keptLessonsCount: 1,
            deletedLessonsCharges: -27,
            openRowsCount: 6,
        });
    });

    // only error 11 is a kept lesson; other errors are not
    it("counts only the extra lessons with entered data as kept", () => {
        const group = closeGroup(41);
        group.generation = {
            ...group.generation,
            errors: [
                { errorCode: 14, errorText: "extra student", lessonDate: null, lessonId: 702 },
                { errorCode: 11, errorText: "extra lesson", lessonDate: null, lessonId: 703 },
            ],
        };

        expect(closeGroupsTotals(closeResult(true, [group])).keptLessonsCount).toBe(1);
    });

    it("is zero without groups", () => {
        expect(closeGroupsTotals(closeResult(false, []))).toEqual({
            groupsCount: 0,
            deletedLessonsCount: 0,
            keptLessonsCount: 0,
            deletedLessonsCharges: 0,
            openRowsCount: 0,
        });
    });
});
