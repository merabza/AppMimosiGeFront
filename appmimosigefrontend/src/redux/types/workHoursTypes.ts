//workHoursTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

import type { ILookupItem } from "./studentContractsTypes";

//employeeName "გვარი სახელი / ნომერი"-ა; hours ხანგრძლივობაა საათებში (2 ათწილადით), დაუსრულებელზე null
export interface IWorkHourRow {
    id: number;
    teacherContractId: number;
    employeeName: string;
    whStart: string;
    whEnd: string | null;
    hours: number | null;
}

//ერთი თანამშრომლის ჯამი ფილტრის ყველა ჩანაწერზე: დასრულებულების საათები და ყველა ჩანაწერის რაოდენობა
export interface IWorkHoursTotal {
    teacherContractId: number;
    employeeName: string;
    hours: number;
    recordsCount: number;
}

export interface IWorkHoursRowsData {
    allRowsCount: number;
    offset: number;
    rows: IWorkHourRow[];
    totals: IWorkHoursTotal[];
}

//whStart და whEnd თარიღი და დროა ("YYYY-MM-DDTHH:mm:ss"); whEnd ცარიელია, სანამ დასრულება არ დაფიქსირდება
export interface IWorkHourRequest {
    teacherContractId: number;
    whStart: string;
    whEnd: string | null;
}

export interface IWorkHour extends IWorkHourRequest {
    id: number;
    employeeName: string;
}

//თანამშრომლები: სამუშაო საათების ჯგუფის მქონე კონტრაქტები "გვარი სახელი / ნომერი"-თ
export interface IWorkHourFormLookups {
    employees: ILookupItem[];
}

//"სამუშაოს დაწყება" / "დასრულება": თანამშრომელი და ლუფტი წუთებში (null და უარყოფითი 0-ია, 30-ზე მეტი შეცდომაა)
export interface IWorkTimeFixRequest {
    teacherContractId: number | null;
    luftMinutes: number | null;
}

//ავტომატური დაგენერირების პერიოდი ("YYYY-MM-DD", ორივე ჩათვლით)
export interface IWorkHoursAutoGenerateRequest {
    dateFrom: string;
    dateTo: string;
}

export interface IWorkHoursAutoGenerateResult {
    createdCount: number;
}
