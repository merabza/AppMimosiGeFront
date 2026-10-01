//paymentsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

//studentName "გვარი სახელი ნომერი"-ა, bankName გადახდის სახე
export interface IPaymentRow {
    id: number;
    studentContractId: number;
    studentName: string;
    payDate: string;
    amount: number;
    document: string | null;
    bankAccountId: number | null;
    bankName: string | null;
    checked: boolean;
}

//totalAmount ფილტრის ყველა გადახდის ჯამია (ყველა გვერდისა)
export interface IPaymentsRowsData {
    allRowsCount: number;
    offset: number;
    totalAmount: number;
    rows: IPaymentRow[];
}

//თანხა შეიძლება უარყოფითი იყოს ("გადატანა"); checked-ს ცვლის მხოლოდ შემოწმების უფლების მქონე როლი
export interface IPaymentRequest {
    studentContractId: number;
    payDate: string;
    amount: number;
    document: string | null;
    bankAccountId: number | null;
    checked: boolean;
}

//academicYearId კონტრაქტის სასწავლო წელია
export interface IPayment extends IPaymentRequest {
    id: number;
    studentContractName: string;
    academicYearId: number;
}

export interface IPaymentFormLookups {
    currentAcademicYearId: number | null;
    academicYears: ILookupItem[];
    bankAccounts: ILookupItem[];
}
