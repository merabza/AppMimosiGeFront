//balancesTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა): ამონაწერი (დარიცხვები და
//გადახდები) და ბალანსები (დეპოზიტები)

import type { ILookupItem } from "./studentContractsTypes";

//დარიცხვა (isPayment = false): id LessonsByStudents-ისაა, document საგანი, თანხა უარყოფითი; გადახდის id გადახდისაა.
//runningTotal ნაშთია ოპერაციის შემდეგ (ყველა ოპერაციის ჯამი თავიდან); studentName "გვარი სახელი / ნომერი"-ა
export interface IStatementRow {
    isPayment: boolean;
    id: number;
    studentContractId: number;
    studentName: string;
    operationDate: string;
    document: string | null;
    amount: number;
    runningTotal: number;
}

//startBalance: ოპერაციები "თარიღიდან"-მდე; endBalance: "თარიღამდე" ჩათვლით (მის გარეშე ყველა)
export interface IStatementRowsData {
    allRowsCount: number;
    offset: number;
    startBalance: number;
    endBalance: number;
    rows: IStatementRow[];
}

export interface IBalancesFormLookups {
    currentAcademicYearId: number | null;
    academicYears: ILookupItem[];
}

//ბალანსების ერთი კონტრაქტი (Access-ის vFrmDeposites); balance null: "თარიღამდე" ოპერაცია არ არის
export interface IDepositRow {
    studentContractId: number;
    academicYearId: number;
    studentName: string;
    contractNumber: string;
    balance: number | null;
    studentPhone: string | null;
    payerName: string;
    payerPhone: string | null;
    nextLessonDate: string | null;
    crmMustPayDate: string | null;
    fourWeekFee: number | null;
    desiredMonthlyPaymentDay: number | null;
    desiredNextPayDate: string | null;
    desiredAfterNextPayDate: string | null;
    desiredDayAmount: number | null;
    stopDate: string | null;
    mustPayToEnd: number | null;
    endDate: string | null;
}

//totalBalance და totalFourWeekFee ნაჩვენები სტრიქონების ჯამებია (Access-ის footer)
export interface IDeposits {
    totalBalance: number;
    totalFourWeekFee: number;
    rows: IDepositRow[];
}

//"": ფილტრის გარეშე; "filter": "ფილტრი"; "call": "დარეკვის ფილტრი"
export type DepositsFilterMode = "" | "filter" | "call";

//academicYearId ცარიელი: ყველა წელი; dateTo "YYYY-MM-DD"
export interface IDepositsRequest {
    academicYearId: string;
    maximum: string;
    dateTo: string;
    filter: DepositsFilterMode;
}

//გადაანგარიშება: ჯგუფების გაკვეთილები (გენერატორი), შემდეგ კონტრაქტების შემდეგი გადახდის თარიღები
export interface IBalancesRecount {
    groupsCount: number;
    changedGroupsCount: number;
    groupErrorsCount: number;
    studentContractsCount: number;
    changedNextPayDatesCount: number;
}
