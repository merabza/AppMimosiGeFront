//groupForm.test.ts

import { describe, expect, it } from "vitest";
import type {
    IGroup,
    IGroupStudentContractLookup,
    IGroupTeacherContractLookup,
} from "../redux/types/groupsTypes";
import { recalculateAfterFeeFieldChange } from "../studentContracts/contractForm";
import {
    dayAfter,
    groupFormToRequest,
    groupToForm,
    newDayTimePlaceRow,
    newGroupForm,
    newStudentRow,
    newTeacherRow,
    selectStudentContract,
    selectTeacherContract,
} from "./groupForm";

const group: IGroup = {
    grpId: 7,
    academicYearId: 11,
    groupCode: "1001",
    courseId: 6,
    groupSizeId: 2,
    studentStatusId: 10,
    voidDate: "2027-06-01T00:00:00",
    dirtyLessons: true,
    teachers: [
        {
            id: 100,
            teacherContractId: 5,
            salarySchemaId: 8,
            startDate: "2026-09-01T00:00:00",
            endDate: null,
        },
    ],
    students: [
        {
            id: 200,
            studentContractId: 20,
            studentContractName: "Alpha Ann / 6.001",
            fourWeekHours: 12,
            fourWeekFee: 70,
            oneHourFee: 5.8333,
            hoursCoefficient: 1,
            startDate: "2026-09-01T00:00:00",
            endDate: "2026-12-01T00:00:00",
            note: "note",
        },
    ],
    dayTimePlaces: [
        {
            id: 300,
            weekDayId: 3,
            lessonStartTimeId: 17,
            hoursCount: 1.5,
            roomId: 2,
            startDate: "2026-09-01T00:00:00",
            endDate: null,
        },
    ],
};

const teacherContracts: IGroupTeacherContractLookup[] = [
    { id: 5, name: "Alpha Ann / T3.01", salarySchemaByHoursId: 8 },
    { id: 6, name: "Beta Bob / T3.02", salarySchemaByHoursId: 11 },
    { id: 7, name: "Gamma Gia / T3.03", salarySchemaByHoursId: null },
];

const studentContract: IGroupStudentContractLookup = {
    scId: 21,
    name: "Delta Dan / 6.002",
    tariffs: [
        { id: 1, courseId: 6, groupSizeId: 1, fourWeekHours: 8, fourWeekFee: 80, oneHourFee: 10 },
        { id: 2, courseId: 6, groupSizeId: 2, fourWeekHours: 12, fourWeekFee: 72, oneHourFee: 6 },
    ],
};

describe("new form and rows", () => {
    // Access: a new group is four-seated (GroupSizeID 2) and has no rows yet
    it("starts a group in the given year with the Access defaults", () => {
        expect(newGroupForm(11)).toEqual({
            academicYearId: "11",
            groupCode: "",
            courseId: "",
            groupSizeId: "2",
            studentStatusId: "",
            voidDate: "",
            teachers: [],
            students: [],
            dayTimePlaces: [],
        });
        expect(newGroupForm(null).academicYearId).toBe("");
    });

    it("starts new rows today with the Access defaults", () => {
        expect(newTeacherRow("2026-09-30")).toMatchObject({
            id: 0,
            teacherContractId: "",
            salarySchemaId: "",
            startDate: "2026-09-30",
            endDate: "",
        });
        expect(newStudentRow("2026-09-30")).toMatchObject({
            id: 0,
            studentContractId: "",
            fourWeekHours: "8",
            fourWeekFee: "48",
            oneHourFee: "6",
            hoursCoefficient: "1",
            startDate: "2026-09-30",
            endDate: "",
            note: "",
        });
        expect(newDayTimePlaceRow("2026-09-30")).toMatchObject({
            id: 0,
            weekDayId: "",
            lessonStartTimeId: "",
            hoursCount: "1",
            roomId: "",
            startDate: "2026-09-30",
            endDate: "",
        });
    });

    it("gives every row its own key", () => {
        const keys = [
            newTeacherRow("2026-09-30").key,
            newStudentRow("2026-09-30").key,
            newDayTimePlaceRow("2026-09-30").key,
        ];
        expect(new Set(keys).size).toBe(3);
    });
});

describe("groupToForm and groupFormToRequest", () => {
    it("shows the group in the form fields", () => {
        const form = groupToForm(group);

        expect(form).toMatchObject({
            academicYearId: "11",
            groupCode: "1001",
            courseId: "6",
            groupSizeId: "2",
            studentStatusId: "10",
            voidDate: "2027-06-01",
        });
        expect(form.teachers[0]).toMatchObject({
            id: 100,
            teacherContractId: "5",
            salarySchemaId: "8",
            startDate: "2026-09-01",
            endDate: "",
        });
        expect(form.students[0]).toMatchObject({
            id: 200,
            studentContractId: "20",
            studentContractName: "Alpha Ann / 6.001",
            fourWeekHours: "12",
            fourWeekFee: "70",
            oneHourFee: "5.8333",
            hoursCoefficient: "1",
            startDate: "2026-09-01",
            endDate: "2026-12-01",
            note: "note",
        });
        expect(form.dayTimePlaces[0]).toMatchObject({
            id: 300,
            weekDayId: "3",
            lessonStartTimeId: "17",
            hoursCount: "1.5",
            roomId: "2",
            startDate: "2026-09-01",
            endDate: "",
        });
    });

    it("sends the form back unchanged", () => {
        expect(groupFormToRequest(groupToForm(group))).toEqual({
            academicYearId: 11,
            groupCode: "1001",
            courseId: 6,
            groupSizeId: 2,
            studentStatusId: 10,
            voidDate: "2027-06-01",
            teachers: [
                {
                    id: 100,
                    teacherContractId: 5,
                    salarySchemaId: 8,
                    startDate: "2026-09-01",
                    endDate: null,
                },
            ],
            students: [
                {
                    id: 200,
                    studentContractId: 20,
                    fourWeekHours: 12,
                    fourWeekFee: 70,
                    oneHourFee: 5.8333,
                    hoursCoefficient: 1,
                    startDate: "2026-09-01",
                    endDate: "2026-12-01",
                    note: "note",
                },
            ],
            dayTimePlaces: [
                {
                    id: 300,
                    weekDayId: 3,
                    lessonStartTimeId: 17,
                    hoursCount: 1.5,
                    roomId: 2,
                    startDate: "2026-09-01",
                    endDate: null,
                },
            ],
        });
    });

    it("trims the code and the note and sends empty values as null", () => {
        const form = groupToForm({
            ...group,
            groupCode: " 1002 ",
            voidDate: null,
            students: [{ ...group.students[0], note: "   ", endDate: null }],
        });
        form.students[0].fourWeekFee = "72,5";
        form.teachers[0].salarySchemaId = "";

        const request = groupFormToRequest(form);

        expect(request.groupCode).toBe("1002");
        expect(request.voidDate).toBeNull();
        expect(request.students[0].note).toBeNull();
        expect(request.students[0].endDate).toBeNull();
        expect(request.students[0].fourWeekFee).toBe(72.5);
        //the server writes the teacher contract's default scheme then
        expect(request.teachers[0].salarySchemaId).toBeNull();
    });

    it("shows a missing note as an empty field and sends it back as null", () => {
        const form = groupToForm({
            ...group,
            students: [{ ...group.students[0], note: null }],
        });

        expect(form.students[0].note).toBe("");
        expect(groupFormToRequest(form).students[0].note).toBeNull();
    });
});

describe("selectTeacherContract", () => {
    // Access TeacherContractID_Change: the scheme becomes the contract's SalarySchemaByHours
    it("sets the scheme of the chosen teacher contract", () => {
        const row = { ...newTeacherRow("2026-09-30"), salarySchemaId: "8" };

        expect(selectTeacherContract(row, "6", teacherContracts)).toMatchObject({
            teacherContractId: "6",
            salarySchemaId: "11",
        });
    });

    it("keeps the chosen scheme when the contract has none", () => {
        const row = { ...newTeacherRow("2026-09-30"), salarySchemaId: "8" };

        expect(selectTeacherContract(row, "7", teacherContracts)).toMatchObject({
            teacherContractId: "7",
            salarySchemaId: "8",
        });
        expect(selectTeacherContract(row, "", teacherContracts)).toMatchObject({
            teacherContractId: "",
            salarySchemaId: "8",
        });
    });
});

describe("selectStudentContract", () => {
    // the tariff of the contract detail with the course and the size of the group
    it("takes the tariff of the matching contract detail", () => {
        expect(
            selectStudentContract(newStudentRow("2026-09-30"), studentContract, "6", "2")
        ).toMatchObject({
            studentContractId: "21",
            studentContractName: "Delta Dan / 6.002",
            fourWeekHours: "12",
            fourWeekFee: "72",
            oneHourFee: "6",
            hoursCoefficient: "1",
        });
    });

    it("keeps the tariff when no detail matches the course and the size", () => {
        const row = { ...newStudentRow("2026-09-30"), fourWeekFee: "50", oneHourFee: "6.25" };

        expect(selectStudentContract(row, studentContract, "7", "2")).toMatchObject({
            studentContractId: "21",
            fourWeekHours: "8",
            fourWeekFee: "50",
            oneHourFee: "6.25",
        });
        expect(selectStudentContract(row, studentContract, "6", "3")).toMatchObject({
            fourWeekFee: "50",
        });
    });

    it("clears the contract when none is chosen", () => {
        const row = selectStudentContract(newStudentRow("2026-09-30"), studentContract, "6", "2");

        expect(selectStudentContract(row, undefined, "6", "2")).toMatchObject({
            studentContractId: "",
            studentContractName: "",
            fourWeekFee: "72",
        });
    });

    // the same recalculation as the contract details of part 06
    it("recalculates the tariff with the contract form function", () => {
        const row = { ...newStudentRow("2026-09-30"), fourWeekHours: "9" };

        expect(recalculateAfterFeeFieldChange(row, "fourWeekHours")).toMatchObject({
            fourWeekFee: "54",
            oneHourFee: "6",
            hoursCoefficient: "1",
        });
    });
});

describe("dayAfter", () => {
    it.each([
        ["2026-09-30", "2026-10-01"],
        ["2026-12-31", "2027-01-01"],
        ["2028-02-28", "2028-02-29"],
    ])("is the next day of %s", (date, expected) => {
        expect(dayAfter(date)).toBe(expected);
    });

    it("is undefined without a date", () => {
        expect(dayAfter("")).toBeUndefined();
        expect(dayAfter("30.09.2026")).toBeUndefined();
        expect(dayAfter("12026-09-30")).toBeUndefined();
        expect(dayAfter("2026-09-301")).toBeUndefined();
    });
});
