//studentContractsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

export interface ILookupItem {
    id: number;
    name: string;
}

export interface IStudentContractRow {
    scId: number;
    contractNumber: string;
    contractDate: string;
    studentHumanId: number;
    studentName: string;
    payerHumanId: number;
    payerName: string;
    academicYearId: number;
    academicYearName: string;
    studentStatusId: number | null;
    studentStatusName: string | null;
    desiredMonthlyPaymentDay: number | null;
}

export interface IStudentContractsRowsData {
    allRowsCount: number;
    offset: number;
    rows: IStudentContractRow[];
}

export interface IStudentContractDetail {
    id: number;
    courseId: number;
    groupSizeId: number;
    fourWeekHours: number;
    fourWeekFee: number;
    oneHourFee: number;
}

export interface IStudentContract {
    scId: number;
    contractNumber: string;
    contractDate: string;
    studentHumanId: number;
    studentName: string;
    payerHumanId: number;
    payerName: string;
    academicYearId: number;
    studentStatusId: number | null;
    desiredMonthlyPaymentDay: number | null;
    nextPayDate: string | null;
    dirtyNextPayDate: boolean;
    details: IStudentContractDetail[];
}

export interface IStudentContractRequest {
    contractNumber: string;
    contractDate: string;
    studentHumanId: number;
    payerHumanId: number;
    academicYearId: number;
    studentStatusId: number | null;
    desiredMonthlyPaymentDay: number | null;
    details: IStudentContractDetail[];
}

export interface IStudentContractFormLookups {
    currentAcademicYearId: number | null;
    academicYears: ILookupItem[];
    studentStatuses: ILookupItem[];
    courses: ILookupItem[];
    groupSizes: ILookupItem[];
}
