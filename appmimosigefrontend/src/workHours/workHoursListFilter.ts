//workHoursListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import { currentMonthToDate } from "../payments/paymentsListFilter";

//სიის ფილტრი (Access-ის FrmWorkHours-ის ფილტრი): თანამშრომელი და თარიღები ("YYYY-MM-DD", ორივე ჩათვლით).
//ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს. თანამშრომელივე ირჩევა "სამუშაოს დაწყებისა" და "დასრულებისთვის",
//თარიღები კი ავტომატური დაგენერირების პერიოდია
export interface IWorkHoursListFilter {
    teacherContractId: string;
    dateFrom: string;
    dateTo: string;
}

type FilterKey = keyof IWorkHoursListFilter;

const filterKeys: FilterKey[] = ["teacherContractId", "dateFrom", "dateTo"];

//ფილტრი ბმულის პარამეტრებშია, რომ ჩანაწერის ფორმიდან დაბრუნებისას შენარჩუნდეს. პარამეტრების გარეშე (მენიუდან)
//ნაგულისხმევია Access-ისა: მიმდინარე თვის 1-ლიდან დღემდე (დღის ბოლომდე)
export function filterFromSearchParams(
    params: URLSearchParams,
    now: Date = new Date()
): IWorkHoursListFilter {
    if (!filterKeys.some((key) => params.has(key)))
        return { teacherContractId: "", ...currentMonthToDate(now) };
    return {
        teacherContractId: params.get("teacherContractId") ?? "",
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
    };
}

//ყველა გასაღები იწერება, ცარიელიც: ასე გასუფთავებული თარიღი ნაგულისხმევ თვეს აღარ აბრუნებს
export function filterToSearchParams(
    filter: IWorkHoursListFilter
): URLSearchParams {
    return new URLSearchParams({
        teacherContractId: filter.teacherContractId,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
    });
}

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის WorkHoursListQueryFactory-ისაა)
export function buildWorkHoursFilterFields(
    filter: IWorkHoursListFilter
): IFilterField[] {
    return [
        { fieldName: "teacherContractId", value: filter.teacherContractId },
        { fieldName: "dateFrom", value: filter.dateFrom },
        { fieldName: "dateTo", value: filter.dateTo },
    ].filter((f) => f.value !== "");
}

//დაწყება დასრულებაზე გვიან: სერვერი ასეთ ფილტრს არ იღებს. "YYYY-MM-DD" სტრიქონებად შედარდება
export function isDateRangeInvalid(filter: IWorkHoursListFilter): boolean {
    return filter.dateTo !== "" && filter.dateFrom > filter.dateTo;
}

//ავტომატურ დაგენერირებას ორივე თარიღი სჭირდება (Access-ში ცარიელი თარიღით არაფერი იქმნებოდა)
export function canAutoGenerate(filter: IWorkHoursListFilter): boolean {
    return filter.dateFrom !== "" && filter.dateTo !== "" && !isDateRangeInvalid(filter);
}

//საათები ორი ათწილადით (როგორც r36 რეპორტში)
export function formatHours(value: unknown): string {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toFixed(2);
}

//ლუფტის ველიდან მოთხოვნისთვის: ცარიელი null-ია (სერვერზე 0), წილადი მთელამდე იჭრება
export function luftToRequest(luft: string): number | null {
    return luft.trim() === "" ? null : Math.trunc(Number(luft));
}
