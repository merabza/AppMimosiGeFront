//teacherContractsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

export interface ITeacherContractRow {
    id: number;
    contractNumber: string;
    contractDate: string;
    teacherHumanId: number;
    teacherName: string;
    salarySchemeName: string | null;
    pensionScheme: boolean;
    indEnt: boolean;
    fixedAmount: number;
    contractEndDate: string | null;
}

export interface ITeacherContractsRowsData {
    allRowsCount: number;
    offset: number;
    rows: ITeacherContractRow[];
}

//სამუშაოს დაწყება და დასრულება მხოლოდ დროა: "HH:mm:ss"
export interface ITeacherContractRequest {
    contractNumber: string;
    contractDate: string;
    teacherHumanId: number;
    bankAccount: string | null;
    bankAccountCode: string | null;
    pensionScheme: boolean;
    indEnt: boolean;
    rsQuoteTypeId: number | null;
    rsCountryId: number;
    fixedAmount: number;
    nextMonth: boolean;
    description: string | null;
    salarySchemaByHoursId: number | null;
    workHourGroupId: number | null;
    workHoursStart: string | null;
    workHoursEnd: string | null;
    contractEndDate: string | null;
}

export interface ITeacherContract extends ITeacherContractRequest {
    id: number;
    teacherName: string;
}

export interface ITeacherContractFormLookups {
    rsQuoteTypes: ILookupItem[];
    rsCountries: ILookupItem[];
    salarySchemes: ILookupItem[];
    workHourGroups: ILookupItem[];
}
