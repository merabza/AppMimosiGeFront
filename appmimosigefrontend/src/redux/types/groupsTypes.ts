//groupsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type {
    ILookupItem,
    IStudentContractDetail,
} from "./studentContractsTypes";

//ძებნის რეჟიმი (Access-ის cmbFindMethod): ჯგუფით, მასწავლებლით, მოსწავლით
export type GroupFindMethod = "group" | "teacher" | "student";

//"": ყველა ჯგუფი
export type GroupState = "active" | "voided" | "";

//ჯგუფით ძებნისას rowId = grpId, teacherName დღევანდელი მასწავლებელია; მასწავლებლით და მოსწავლით ძებნისას
//rowId ჯგუფის მასწავლებლის ან მოსწავლის სტრიქონია, startDate/endDate კი მისი პერიოდი
export interface IGroupRow {
    rowId: number;
    grpId: number;
    groupCode: string;
    academicYearName: string;
    courseName: string;
    groupSizeName: string;
    studentStatusName: string;
    voidDate: string | null;
    dirtyLessons: boolean;
    teacherName: string | null;
    activeStudentsCount: number | null;
    studentName: string | null;
    startDate: string | null;
    endDate: string | null;
}

export interface IGroupsRowsData {
    allRowsCount: number;
    offset: number;
    rows: IGroupRow[];
}

export interface IGroupTeacher {
    id: number;
    teacherContractId: number;
    salarySchemaId: number;
    startDate: string;
    endDate: string | null;
}

export interface IGroupStudent {
    id: number;
    studentContractId: number;
    studentContractName: string;
    fourWeekHours: number;
    fourWeekFee: number;
    oneHourFee: number;
    hoursCoefficient: number;
    startDate: string;
    endDate: string | null;
    note: string | null;
}

export interface IGroupDayTimePlace {
    id: number;
    weekDayId: number;
    lessonStartTimeId: number;
    hoursCount: number;
    roomId: number;
    startDate: string;
    endDate: string | null;
}

export interface IGroup {
    grpId: number;
    academicYearId: number;
    groupCode: string;
    courseId: number;
    groupSizeId: number;
    studentStatusId: number;
    voidDate: string | null;
    dirtyLessons: boolean;
    teachers: IGroupTeacher[];
    students: IGroupStudent[];
    dayTimePlaces: IGroupDayTimePlace[];
}

//id 0 ახალ სტრიქონს ნიშნავს; სქემის გარეშე სერვერი მასწავლებლის კონტრაქტის ძირითად სქემას წერს
export interface IGroupTeacherRequest {
    id: number;
    teacherContractId: number;
    salarySchemaId: number | null;
    startDate: string;
    endDate: string | null;
}

export interface IGroupStudentRequest {
    id: number;
    studentContractId: number;
    fourWeekHours: number;
    fourWeekFee: number;
    oneHourFee: number;
    hoursCoefficient: number;
    startDate: string;
    endDate: string | null;
    note: string | null;
}

export interface IGroupDayTimePlaceRequest {
    id: number;
    weekDayId: number;
    lessonStartTimeId: number;
    hoursCount: number;
    roomId: number;
    startDate: string;
    endDate: string | null;
}

export interface IGroupRequest {
    academicYearId: number;
    groupCode: string;
    courseId: number;
    groupSizeId: number;
    studentStatusId: number;
    voidDate: string | null;
    teachers: IGroupTeacherRequest[];
    students: IGroupStudentRequest[];
    dayTimePlaces: IGroupDayTimePlaceRequest[];
}

//"გვარი სახელი / ნომერი"; salarySchemaByHoursId მასწავლებლის არჩევისას სქემის ველში ჩაიწერება
export interface IGroupTeacherContractLookup {
    id: number;
    name: string;
    salarySchemaByHoursId: number | null;
}

//"გვარი სახელი / ნომერი" და კონტრაქტის ტარიფები (საგანი და ჯგუფის ზომა)
export interface IGroupStudentContractLookup {
    scId: number;
    name: string;
    tariffs: IStudentContractDetail[];
}

export interface IGroupFormLookups {
    currentAcademicYearId: number | null;
    academicYears: ILookupItem[];
    courses: ILookupItem[];
    groupSizes: ILookupItem[];
    studentStatuses: ILookupItem[];
    teacherContracts: IGroupTeacherContractLookup[];
    salarySchemes: ILookupItem[];
    weekDays: ILookupItem[];
    lessonStartTimes: ILookupItem[];
    rooms: ILookupItem[];
}
