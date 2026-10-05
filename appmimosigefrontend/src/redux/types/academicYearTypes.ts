//academicYearTypes.ts

import type { IGroupLessonsGeneration } from "./lessonGeneratorTypes";
import type { ILookupItem } from "./studentContractsTypes";

//გლობალური წლის ამომრჩევის წლები (დაწყების რიგით) და მიმდინარე წელი
export interface IAcademicYears {
    academicYears: ILookupItem[];
    currentAcademicYearId: number | null;
}

//ოსტატის წელი: კონტრაქტები, ჯგუფები და მათ შორის დაუხურავი ჯგუფები
export interface IAcademicYearInfo {
    ayId: number;
    academicYearName: string;
    startDate: string;
    finishDate: string;
    studentContractsCount: number;
    groupsCount: number;
    openGroupsCount: number;
}

export interface IAcademicYearWizardInfo {
    academicYears: IAcademicYearInfo[];
    currentAcademicYearId: number | null;
    lastOperationMonth: string | null;
    horizonEnd: string | null;
}

//ნაბიჯი 1: ახალი წელი (dry-run-ში ayId ცარიელია)
export interface INewAcademicYear {
    dryRun: boolean;
    ayId: number | null;
    academicYearName: string;
    startDate: string;
    finishDate: string;
    contractNumberPrefix: string;
    alreadyExists: boolean;
}

//ნაბიჯი 2: დასახურავი ჯგუფი და მისი გენერაცია
export interface ICloseGroup {
    grpId: number;
    groupCode: string;
    courseName: string;
    previousVoidDate: string | null;
    openTeacherRowsCount: number;
    openStudentRowsCount: number;
    openScheduleRowsCount: number;
    deletedLessonsCharges: number;
    generation: IGroupLessonsGeneration;
}

export interface ICloseAcademicYearGroups {
    dryRun: boolean;
    academicYearId: number;
    closeDate: string;
    horizonEnd: string;
    groups: ICloseGroup[];
}

export interface ICloseGroupsRequest {
    ayId: number;
    closeDate: string;
    dryRun: boolean;
}
