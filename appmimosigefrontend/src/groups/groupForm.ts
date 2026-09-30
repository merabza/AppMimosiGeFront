//groupForm.ts

import type {
    IGroup,
    IGroupRequest,
    IGroupStudentContractLookup,
    IGroupTeacherContractLookup,
} from "../redux/types/groupsTypes";
import { toDateInputValue } from "../studentContracts/dateFormat";

//ფორმის მდგომარეობა. რიცხვითი, თარიღის და ჩამოსაშლელი ველები სტრიქონებადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს.
//key React-ისთვისაა; ახალ სტრიქონს id 0 აქვს. თარიღები "YYYY-MM-DD"-ია, ცარიელი დასრულება = დაუსრულებელი პერიოდი

export interface ITeacherFormRow {
    key: number;
    id: number;
    teacherContractId: string;
    salarySchemaId: string;
    startDate: string;
    endDate: string;
}

export interface IStudentFormRow {
    key: number;
    id: number;
    studentContractId: string;
    studentContractName: string;
    fourWeekHours: string;
    fourWeekFee: string;
    oneHourFee: string;
    hoursCoefficient: string;
    startDate: string;
    endDate: string;
    note: string;
}

export interface IDayTimePlaceFormRow {
    key: number;
    id: number;
    weekDayId: string;
    lessonStartTimeId: string;
    hoursCount: string;
    roomId: string;
    startDate: string;
    endDate: string;
}

export interface IGroupForm {
    academicYearId: string;
    groupCode: string;
    courseId: string;
    groupSizeId: string;
    studentStatusId: string;
    voidDate: string;
    teachers: ITeacherFormRow[];
    students: IStudentFormRow[];
    dayTimePlaces: IDayTimePlaceFormRow[];
}

let nextRowKey = 1;

//Access-ის ნაგულისხმევი ჯგუფის ზომა: 2 (ოთხადგილიანი)
export const defaultGroupSizeId = "2";

export function newGroupForm(academicYearId: number | null): IGroupForm {
    return {
        academicYearId: academicYearId?.toString() ?? "",
        groupCode: "",
        courseId: "",
        groupSizeId: defaultGroupSizeId,
        studentStatusId: "",
        voidDate: "",
        teachers: [],
        students: [],
        dayTimePlaces: [],
    };
}

//დაწყება ნაგულისხმევად დღეს (Access-ის =Date())
export function newTeacherRow(today: string): ITeacherFormRow {
    return {
        key: nextRowKey++,
        id: 0,
        teacherContractId: "",
        salarySchemaId: "",
        startDate: today,
        endDate: "",
    };
}

//Access-ის ნაგულისხმევი ტარიფი: 8 საათი, 48, 6, კოეფიციენტი 1
export function newStudentRow(today: string): IStudentFormRow {
    return {
        key: nextRowKey++,
        id: 0,
        studentContractId: "",
        studentContractName: "",
        fourWeekHours: "8",
        fourWeekFee: "48",
        oneHourFee: "6",
        hoursCoefficient: "1",
        startDate: today,
        endDate: "",
        note: "",
    };
}

export function newDayTimePlaceRow(today: string): IDayTimePlaceFormRow {
    return {
        key: nextRowKey++,
        id: 0,
        weekDayId: "",
        lessonStartTimeId: "",
        hoursCount: "1",
        roomId: "",
        startDate: today,
        endDate: "",
    };
}

export function groupToForm(group: IGroup): IGroupForm {
    return {
        academicYearId: group.academicYearId.toString(),
        groupCode: group.groupCode,
        courseId: group.courseId.toString(),
        groupSizeId: group.groupSizeId.toString(),
        studentStatusId: group.studentStatusId.toString(),
        voidDate: toDateInputValue(group.voidDate),
        teachers: group.teachers.map((t) => ({
            key: nextRowKey++,
            id: t.id,
            teacherContractId: t.teacherContractId.toString(),
            salarySchemaId: t.salarySchemaId.toString(),
            startDate: toDateInputValue(t.startDate),
            endDate: toDateInputValue(t.endDate),
        })),
        students: group.students.map((s) => ({
            key: nextRowKey++,
            id: s.id,
            studentContractId: s.studentContractId.toString(),
            studentContractName: s.studentContractName,
            fourWeekHours: s.fourWeekHours.toString(),
            fourWeekFee: s.fourWeekFee.toString(),
            oneHourFee: s.oneHourFee.toString(),
            hoursCoefficient: s.hoursCoefficient.toString(),
            startDate: toDateInputValue(s.startDate),
            endDate: toDateInputValue(s.endDate),
            note: s.note ?? "",
        })),
        dayTimePlaces: group.dayTimePlaces.map((d) => ({
            key: nextRowKey++,
            id: d.id,
            weekDayId: d.weekDayId.toString(),
            lessonStartTimeId: d.lessonStartTimeId.toString(),
            hoursCount: d.hoursCount.toString(),
            roomId: d.roomId.toString(),
            startDate: toDateInputValue(d.startDate),
            endDate: toDateInputValue(d.endDate),
        })),
    };
}

function toNumber(value: string): number {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalDate(value: string): string | null {
    return value === "" ? null : value;
}

export function groupFormToRequest(form: IGroupForm): IGroupRequest {
    return {
        academicYearId: toNumber(form.academicYearId),
        groupCode: form.groupCode.trim(),
        courseId: toNumber(form.courseId),
        groupSizeId: toNumber(form.groupSizeId),
        studentStatusId: toNumber(form.studentStatusId),
        voidDate: toOptionalDate(form.voidDate),
        teachers: form.teachers.map((t) => ({
            id: t.id,
            teacherContractId: toNumber(t.teacherContractId),
            //სქემის გარეშე სერვერი კონტრაქტის ძირითად სქემას წერს
            salarySchemaId: t.salarySchemaId === "" ? null : toNumber(t.salarySchemaId),
            startDate: t.startDate,
            endDate: toOptionalDate(t.endDate),
        })),
        students: form.students.map((s) => ({
            id: s.id,
            studentContractId: toNumber(s.studentContractId),
            fourWeekHours: toNumber(s.fourWeekHours),
            fourWeekFee: toNumber(s.fourWeekFee),
            oneHourFee: toNumber(s.oneHourFee),
            hoursCoefficient: toNumber(s.hoursCoefficient),
            startDate: s.startDate,
            endDate: toOptionalDate(s.endDate),
            note: s.note.trim() === "" ? null : s.note.trim(),
        })),
        dayTimePlaces: form.dayTimePlaces.map((d) => ({
            id: d.id,
            weekDayId: toNumber(d.weekDayId),
            lessonStartTimeId: toNumber(d.lessonStartTimeId),
            hoursCount: toNumber(d.hoursCount),
            roomId: toNumber(d.roomId),
            startDate: d.startDate,
            endDate: toOptionalDate(d.endDate),
        })),
    };
}

//Access-ის TeacherContractID_Change: მასწავლებლის შეცვლისას სქემა ხდება მისი კონტრაქტის ძირითადი სქემა
//(SalarySchemaByHours). თუ კონტრაქტს სქემა არ აქვს, არჩეული სქემა რჩება
export function selectTeacherContract(
    row: ITeacherFormRow,
    teacherContractId: string,
    teacherContracts: IGroupTeacherContractLookup[]
): ITeacherFormRow {
    const schemeId = teacherContracts.find(
        (c) => c.id.toString() === teacherContractId
    )?.salarySchemaByHoursId;
    return {
        ...row,
        teacherContractId,
        salarySchemaId:
            schemeId === null || schemeId === undefined
                ? row.salarySchemaId
                : schemeId.toString(),
    };
}

//მოსწავლის კონტრაქტის არჩევისას ტარიფი კონტრაქტის იმ დეტალიდან ჩაიწერება, რომლის საგანი და ჯგუფის ზომა ჯგუფისას
//ემთხვევა (Access-ში ეს კოდი დაკომენტარებული იყო, მომხმარებლის გადაწყვეტილებით ჩაირთო, D58). სხვა შემთხვევაში ტარიფი რჩება
export function selectStudentContract(
    row: IStudentFormRow,
    contract: IGroupStudentContractLookup | undefined,
    courseId: string,
    groupSizeId: string
): IStudentFormRow {
    const selected: IStudentFormRow = {
        ...row,
        studentContractId: contract?.scId.toString() ?? "",
        studentContractName: contract?.name ?? "",
    };
    const tariff = contract?.tariffs.find(
        (t) =>
            t.courseId.toString() === courseId &&
            t.groupSizeId.toString() === groupSizeId
    );
    if (!tariff) return selected;
    return {
        ...selected,
        fourWeekHours: tariff.fourWeekHours.toString(),
        fourWeekFee: tariff.fourWeekFee.toString(),
        oneHourFee: tariff.oneHourFee.toString(),
    };
}

//დასრულების თარიღის ველის min: პერიოდი [დაწყება, დასრულება) ცარიელი არ უნდა იყოს
export function dayAfter(date: string): string | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1))
        .toISOString()
        .slice(0, 10);
}
