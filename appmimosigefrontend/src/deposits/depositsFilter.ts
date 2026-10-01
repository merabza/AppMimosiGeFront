//depositsFilter.ts

import { todayDateInputValue } from "../studentContracts/dateFormat";
import type {
    DepositsFilterMode,
    IDepositsRequest,
} from "../redux/types/balancesTypes";

//ყველა სასწავლო წლის კონტრაქტები (წლის ფილტრის გარეშე)
export const allAcademicYears = "all";

//ბალანსების ფილტრი (Access-ის FrmDeposites). academicYearId: ცარიელი = მიმდინარე წელი, "all" = ყველა წელი;
//maximum: Access-ის "მაქსიმუმი"; dateTo: "თარიღამდე" ("YYYY-MM-DD", ჩათვლით); filter: ღილაკი
export interface IDepositsFilter {
    academicYearId: string;
    maximum: string;
    dateTo: string;
    filter: DepositsFilterMode;
}

const filterModes: DepositsFilterMode[] = ["", "filter", "call"];

//Access-ის ნაგულისხმევი "თარიღამდე": დღეს + 5 დღე (დღის ბოლომდე)
export function defaultDateTo(now: Date = new Date()): string {
    return todayDateInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5));
}

//ფილტრი ბმულის პარამეტრებშია; გამოტოვებული პარამეტრი Access-ის ნაგულისხმევია (მაქსიმუმი 0, თარიღამდე დღეს + 5)
export function filterFromSearchParams(
    params: URLSearchParams,
    now: Date = new Date()
): IDepositsFilter {
    const filter = params.get("filter") ?? "";
    return {
        academicYearId: params.get("academicYearId") ?? "",
        maximum: params.get("maximum") ?? "0",
        dateTo: params.get("dateTo") ?? defaultDateTo(now),
        filter: filterModes.includes(filter as DepositsFilterMode)
            ? (filter as DepositsFilterMode)
            : "",
    };
}

export function filterToSearchParams(filter: IDepositsFilter): URLSearchParams {
    return new URLSearchParams({
        academicYearId: filter.academicYearId,
        maximum: filter.maximum,
        dateTo: filter.dateTo,
        filter: filter.filter,
    });
}

//API-ის მოთხოვნა: ცარიელი წელი მიმდინარეა, "all" წლის გარეშე; ცარიელი მაქსიმუმი 0-ია
export function toDepositsRequest(
    filter: IDepositsFilter,
    currentAcademicYearId: number | null
): IDepositsRequest {
    let academicYearId = filter.academicYearId;
    if (academicYearId === allAcademicYears) academicYearId = "";
    else if (academicYearId === "") academicYearId = currentAcademicYearId?.toString() ?? "";
    return {
        academicYearId,
        maximum: filter.maximum === "" ? "0" : filter.maximum,
        dateTo: filter.dateTo,
        filter: filter.filter,
    };
}

//ტელეფონი Access-ის ფორმატით "000-00-00-00" (9 ციფრი); სხვა მნიშვნელობა უცვლელად
export function formatPhone(phone: string | null): string {
    if (!phone) return "";
    if (!/^\d{9}$/.test(phone)) return phone;
    return `${phone.slice(0, 3)}-${phone.slice(3, 5)}-${phone.slice(5, 7)}-${phone.slice(7)}`;
}
