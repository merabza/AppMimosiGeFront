//lessonsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

//studentsCount გაკვეთილის მოსწავლეების რაოდენობაა, presentCount დამსწრეებისა
export interface ILessonRow {
    lessonId: number;
    lessonDt: string;
    grpId: number;
    groupCode: string;
    courseName: string;
    teacherName: string;
    substituteTeacherName: string | null;
    lessonStatusId: number;
    lessonStatusName: string;
    studentsCount: number;
    presentCount: number;
}

export interface ILessonsRowsData {
    allRowsCount: number;
    offset: number;
    rows: ILessonRow[];
}

//ჯგუფები "კოდი / სასწავლო წელი", მასწავლებლები "გვარი სახელი / ნომერი"
export interface ILessonFormLookups {
    groups: ILookupItem[];
    teacherContracts: ILookupItem[];
    lessonStatuses: ILookupItem[];
}

//მოსწავლე და საათები მხოლოდ საჩვენებელია: საათებს გენერატორი წერს
export interface ILessonStudent {
    id: number;
    studentContractId: number;
    studentName: string;
    hoursCount: number;
    present: boolean;
    theme: string | null;
    rate: number | null;
    teacherComment: string | null;
    studentComment: string | null;
    studentLateMinutes: number;
}

//ჯგუფი, მასწავლებელი, დრო, სქემა, fourWeekHours და teoMin/MaxDate მხოლოდ საჩვენებელია (მათ გენერატორი ადგენს).
//previousLessonId/nextLessonId იმავე ჯგუფის წინა და შემდეგი გაკვეთილია
export interface ILesson {
    lessonId: number;
    grpId: number;
    groupCode: string;
    courseName: string;
    teacherContractId: number;
    teacherName: string;
    lessonDt: string;
    salarySchemeName: string;
    fourWeekHours: number;
    teoMinDate: string;
    teoMaxDate: string;
    lessonStatusId: number;
    substituteTeacherContractId: number | null;
    teacherLateMinutes: number;
    recoverDate: string | null;
    note: string | null;
    previousLessonId: number | null;
    nextLessonId: number | null;
    students: ILessonStudent[];
}

export interface ILessonStudentRequest {
    id: number;
    present: boolean;
    theme: string | null;
    rate: number | null;
    teacherComment: string | null;
    studentComment: string | null;
    studentLateMinutes: number;
}

export interface ILessonRequest {
    lessonStatusId: number;
    substituteTeacherContractId: number | null;
    teacherLateMinutes: number;
    recoverDate: string | null;
    note: string | null;
    students: ILessonStudentRequest[];
}
