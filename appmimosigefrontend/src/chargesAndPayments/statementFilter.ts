//statementFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import { chargesAndPaymentsMenuKey } from "./chargesAndPaymentsMenu";

//ამონაწერის ფილტრი (Access-ის FrmChargesAndPayments). ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს; თარიღები
//"YYYY-MM-DD"-ია, ორივე ჩათვლით. academicYearId მხოლოდ მოსწავლის (კონტრაქტის) ასარჩევ სიას ზღუდავს; ცარიელი
//მიმდინარე წელს ნიშნავს
export interface IStatementFilter {
    academicYearId: string;
    studentContractId: string;
    dateFrom: string;
    dateTo: string;
}

type FilterKey = keyof IStatementFilter;

const filterKeys: FilterKey[] = ["academicYearId", "studentContractId", "dateFrom", "dateTo"];

//Access-ის ნაგულისხმევი შუალედი: წინა თვის 1-ლიდან დღემდე (დღის ბოლომდე)
export function previousMonthToDate(now: Date = new Date()): {
    dateFrom: string;
    dateTo: string;
} {
    return {
        dateFrom: todayDateInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        dateTo: todayDateInputValue(now),
    };
}

//ფილტრი ბმულის პარამეტრებშია. პარამეტრების გარეშე (მენიუდან) ნაგულისხმევია Access-ისა: ყველა მოსწავლე, წინა
//თვიდან დღემდე
export function filterFromSearchParams(
    params: URLSearchParams,
    now: Date = new Date()
): IStatementFilter {
    if (!filterKeys.some((key) => params.has(key)))
        return { academicYearId: "", studentContractId: "", ...previousMonthToDate(now) };
    return {
        academicYearId: params.get("academicYearId") ?? "",
        studentContractId: params.get("studentContractId") ?? "",
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
    };
}

//ყველა გასაღები იწერება, ცარიელიც: ასე გასუფთავებული თარიღი ნაგულისხმევ შუალედს აღარ აბრუნებს
export function filterToSearchParams(filter: IStatementFilter): URLSearchParams {
    return new URLSearchParams({
        academicYearId: filter.academicYearId,
        studentContractId: filter.studentContractId,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
    });
}

//ფილტრი GridView-ის filterFields-ად (სახელები backend-ის StatementListQueryFactory-ისაა)
export function buildStatementFilterFields(filter: IStatementFilter): IFilterField[] {
    return [
        { fieldName: "studentContractId", value: filter.studentContractId },
        { fieldName: "dateFrom", value: filter.dateFrom },
        { fieldName: "dateTo", value: filter.dateTo },
    ].filter((f) => f.value !== "");
}

//დაწყება დასრულებაზე გვიან: სერვერი ასეთ ფილტრს არ იღებს. ცარიელი საზღვარი შეზღუდვის არქონაა
export function isDateRangeInvalid(filter: IStatementFilter): boolean {
    return filter.dateFrom !== "" && filter.dateTo !== "" && filter.dateFrom > filter.dateTo;
}

//ბალანსებიდან გახსნილი ამონაწერი (Access: კონტრაქტი და ბალანსების "თარიღამდე"; "თარიღიდან" ნაგულისხმევი რჩება)
export function statementUrl(
    studentContractId: number,
    academicYearId: number,
    dateTo: string,
    now: Date = new Date()
): string {
    const params = filterToSearchParams({
        academicYearId: academicYearId.toString(),
        studentContractId: studentContractId.toString(),
        dateFrom: previousMonthToDate(now).dateFrom,
        dateTo,
    });
    return `/${chargesAndPaymentsMenuKey}?${params.toString()}`;
}
