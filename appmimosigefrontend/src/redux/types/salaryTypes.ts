//salaryTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

//უწყისების სიის სტრიქონი; თარიღები "YYYY-MM-DDT00:00:00"
export interface ISalaryHeaderRow {
    shId: number;
    shChargeDate: string;
    shTransferDate: string;
    linesCount: number;
    amountNetSum: number;
}

//countPlaceId: 1 = დანამატი, 2 = გამოქვითვა ხელზე ასაღებიდან, null = გამოთვლაში არ მონაწილეობს
export interface ISalaryPartType {
    id: number;
    name: string;
    countPlaceId: number | null;
}

//თანამშრომლები: ყველა კონტრაქტი "გვარი სახელი / ნომერი"-თ
export interface ISalaryFormLookups {
    employees: ILookupItem[];
    partTypes: ISalaryPartType[];
}

export interface ISalaryPart {
    spId: number;
    teacherContractId: number;
    employeeName: string;
    salaryPartTypeId: number | null;
    salaryPartTypeName: string | null;
    spAmount: number;
}

export interface ISalaryLine {
    saId: number;
    teacherContractId: number;
    employeeName: string;
    saNetAmountRound: number;
    saAmountGross: number;
    saPension2: number;
    saGrossMinusPension: number;
    saIncomeTax: number;
    saGamokvitva: number;
    saPension4: number;
    saAmountNet: number;
    saMonthDate: string;
    rsQuoteTypeId: number | null;
    saIndividualIncomeTax: number;
}

export interface ISalaryLineDetail {
    sadId: number;
    saId: number;
    employeeName: string;
    groupId: number;
    groupCode: string;
    sadHoursCount: number;
    sadAmount: number;
    sadHourCost: number;
}

export interface ISalaryHeader {
    shId: number;
    shChargeDate: string;
    shTransferDate: string;
    parts: ISalaryPart[];
    lines: ISalaryLine[];
    details: ISalaryLineDetail[];
}

//თარიღები "YYYY-MM-DD"
export interface ISalaryHeaderRequest {
    shChargeDate: string;
    shTransferDate: string;
}

export interface ISalaryPartRequest {
    teacherContractId: number;
    salaryPartTypeId: number;
    spAmount: number;
}

export interface ISalaryCountResult {
    lessonPartsCount: number;
    linesCount: number;
    detailsCount: number;
}
