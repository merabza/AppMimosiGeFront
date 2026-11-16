//lessonForm.test.ts

import { describe, expect, it } from "vitest";
import { lessonData } from "../testUtils/lessonsTestStore";
import {
    clearAttendanceAndRecoverDate,
    clearStudentRow,
    hasEnteredData,
    hasWrongVoidStatus,
    isCancelledStatus,
    lessonFormToRequest,
    lessonToForm,
    markAllPresent,
    type ILessonForm,
    type ILessonStudentFormRow,
} from "./lessonForm";

const emptyRow: ILessonStudentFormRow = {
    id: 1,
    studentName: "Gamma Gia",
    hoursCount: 1,
    present: false,
    theme: "",
    rate: "",
    teacherComment: "",
    studentComment: "",
    studentLateMinutes: "0",
};

describe("lessonToForm", () => {
    it("turns the lesson into strings, null into empty", () => {
        const form = lessonToForm(
            lessonData({
                lessonStatusId: 3,
                substituteTeacherContractId: 5,
                teacherLateMinutes: 7,
                recoverDate: "2026-10-05T00:00:00",
                note: "late",
            })
        );

        expect(form).toEqual({
            lessonStatusId: "3",
            substituteTeacherContractId: "5",
            teacherLateMinutes: "7",
            recoverDate: "2026-10-05",
            note: "late",
            students: [
                {
                    id: 21,
                    studentName: "Gamma Gia",
                    hoursCount: 1.5,
                    present: true,
                    theme: "Fractions",
                    rate: "9",
                    teacherComment: "good",
                    studentComment: "",
                    studentLateMinutes: "5",
                },
                { ...emptyRow, id: 22, studentName: "Delta Dan", hoursCount: 1.5 },
                { ...emptyRow, id: 23, studentName: "Epsilon Eva", hoursCount: 2 },
            ],
        });
    });

    it("leaves the empty optional fields empty", () => {
        const form = lessonToForm(lessonData());

        expect(form.substituteTeacherContractId).toBe("");
        expect(form.recoverDate).toBe("");
        expect(form.note).toBe("");
    });
});

describe("lessonFormToRequest", () => {
    it("sends numbers, trimmed texts and the editable student fields only", () => {
        const request = lessonFormToRequest({
            lessonStatusId: "2",
            substituteTeacherContractId: "5",
            teacherLateMinutes: "12",
            recoverDate: "2026-10-05",
            note: "  replaced  ",
            students: [
                {
                    ...emptyRow,
                    present: true,
                    theme: " Fractions ",
                    rate: "7.5",
                    teacherComment: "tc",
                    studentComment: "sc",
                    studentLateMinutes: "3",
                },
            ],
        });

        expect(request).toEqual({
            lessonStatusId: 2,
            substituteTeacherContractId: 5,
            teacherLateMinutes: 12,
            recoverDate: "2026-10-05",
            note: "replaced",
            students: [
                {
                    id: 1,
                    present: true,
                    theme: "Fractions",
                    rate: 7.5,
                    teacherComment: "tc",
                    studentComment: "sc",
                    studentLateMinutes: 3,
                },
            ],
        });
    });

    // the generator counts an empty string as entered data, so empty texts go as null (Q17)
    it("sends empty values as null and empty minutes as 0", () => {
        const request = lessonFormToRequest({
            lessonStatusId: "1",
            substituteTeacherContractId: "",
            teacherLateMinutes: "",
            recoverDate: "",
            note: "   ",
            students: [{ ...emptyRow, theme: " ", studentLateMinutes: "" }],
        });

        expect(request).toEqual({
            lessonStatusId: 1,
            substituteTeacherContractId: null,
            teacherLateMinutes: 0,
            recoverDate: null,
            note: null,
            students: [
                {
                    id: 1,
                    present: false,
                    theme: null,
                    rate: null,
                    teacherComment: null,
                    studentComment: null,
                    studentLateMinutes: 0,
                },
            ],
        });
    });

    // a blank number is no number: "  " would otherwise turn into 0
    it("sends a blank rate as null and blank minutes as 0", () => {
        const request = lessonFormToRequest({
            ...lessonToForm(lessonData()),
            teacherLateMinutes: " ",
            students: [{ ...emptyRow, rate: "  ", studentLateMinutes: " " }],
        });

        expect(request.teacherLateMinutes).toBe(0);
        expect(request.students[0].rate).toBeNull();
        expect(request.students[0].studentLateMinutes).toBe(0);
    });

    it("keeps a rate of 0", () => {
        expect(
            lessonFormToRequest({
                ...lessonToForm(lessonData()),
                students: [{ ...emptyRow, rate: "0" }],
            }).students[0].rate
        ).toBe(0);
    });
});

describe("markAllPresent", () => {
    it("marks every student present and keeps the rest of the row", () => {
        const rows = lessonToForm(lessonData()).students;

        const marked = markAllPresent(rows);

        expect(marked.map((r) => r.present)).toEqual([true, true, true]);
        expect(marked[0]).toBe(rows[0]);
        expect(marked[1]).toEqual({ ...rows[1], present: true });
    });
});

describe("clearStudentRow", () => {
    it("clears attendance, theme, rate, comments and lateness", () => {
        const row = lessonToForm(lessonData()).students[0];

        expect(clearStudentRow(row)).toEqual({
            ...emptyRow,
            id: 21,
            hoursCount: 1.5,
        });
    });
});

describe("void status (r12)", () => {
    const form = (changes: Partial<ILessonForm>): ILessonForm => ({
        ...lessonToForm(lessonData()),
        students: [emptyRow, { ...emptyRow, id: 2 }],
        ...changes,
    });

    it("counts every status but 'not cancelled' as cancelled", () => {
        expect(isCancelledStatus("1")).toBe(false);
        expect(isCancelledStatus("2")).toBe(true);
        expect(isCancelledStatus("3")).toBe(true);
    });

    it.each([
        ["held with attendance and a recover date", "1", "2026-10-05", true, false],
        ["cancelled without attendance and recover date", "2", "", false, false],
        ["cancelled with a recover date", "2", "2026-10-05", false, true],
        ["cancelled with a present student", "3", "", true, true],
    ])("%s is wrong: %s", (_, lessonStatusId, recoverDate, present, wrong) => {
        expect(
            hasWrongVoidStatus(
                form({ lessonStatusId, recoverDate, students: [emptyRow, { ...emptyRow, id: 2, present }] })
            )
        ).toBe(wrong);
    });

    it("clears attendance and the recover date and keeps the rest", () => {
        const present = { ...emptyRow, id: 2, present: true, theme: "x" };
        const before = form({ lessonStatusId: "2", recoverDate: "2026-10-05", students: [emptyRow, present] });

        const cleared = clearAttendanceAndRecoverDate(before);

        expect(cleared).toEqual({ ...before, recoverDate: "", students: [emptyRow, { ...present, present: false }] });
        expect(cleared.students[0]).toBe(emptyRow);
    });
});

describe("hasEnteredData", () => {
    it("is false for an empty row and for lateness alone", () => {
        expect(hasEnteredData(emptyRow)).toBe(false);
        expect(hasEnteredData({ ...emptyRow, studentLateMinutes: "5", theme: "  " })).toBe(false);
    });

    it.each([
        ["present", { present: true }],
        ["theme", { theme: "x" }],
        ["rate", { rate: "0" }],
        ["teacher comment", { teacherComment: "x" }],
        ["student comment", { studentComment: "x" }],
    ])("is true with a %s", (_, changes) => {
        expect(hasEnteredData({ ...emptyRow, ...changes })).toBe(true);
    });
});
