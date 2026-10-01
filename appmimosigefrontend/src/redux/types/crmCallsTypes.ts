//crmCallsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

//studentName "გვარი სახელი / ნომერი"-ა; callConversation სრული ტექსტია
export interface ICrmCallRow {
    id: number;
    studentContractId: number;
    studentName: string;
    callDate: string;
    callTypeId: number;
    callTypeName: string;
    answerTypeId: number;
    answerTypeName: string;
    callConversation: string | null;
    mustPayDate: string | null;
}

export interface ICrmCallsRowsData {
    allRowsCount: number;
    offset: number;
    rows: ICrmCallRow[];
}

//callDate თარიღი და დროა ("YYYY-MM-DDTHH:mm:ss"), mustPayDate მხოლოდ თარიღი; answerTypeId სავალდებულოა
export interface ICrmCallRequest {
    studentContractId: number;
    callTypeId: number;
    callDate: string;
    answerTypeId: number | null;
    callConversation: string | null;
    mustPayDate: string | null;
}

//academicYearId კონტრაქტის სასწავლო წელია
export interface ICrmCall extends Omit<ICrmCallRequest, "answerTypeId"> {
    id: number;
    studentContractName: string;
    academicYearId: number;
    answerTypeId: number;
}

export interface ICrmCallFormLookups {
    currentAcademicYearId: number | null;
    academicYears: ILookupItem[];
    callTypes: ILookupItem[];
    answerTypes: ILookupItem[];
}
