//paymentsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";

//სიის ფილტრი (Access-ის FrmPayments-ის ფილტრი). ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს; თარიღები
//"YYYY-MM-DD"-ია, ორივე ჩათვლით. academicYearId მხოლოდ მოსწავლის (კონტრაქტის) ასარჩევ სიას ზღუდავს და თავად
//გადახდებს არ ფილტრავს; ცარიელი მიმდინარე წელს ნიშნავს
export interface IPaymentsListFilter {
    academicYearId: string;
    studentContractId: string;
    bankAccountId: string;
    dateFrom: string;
    dateTo: string;
}

type FilterKey = keyof IPaymentsListFilter;

const filterKeys: FilterKey[] = [
    "academicYearId",
    "studentContractId",
    "bankAccountId",
    "dateFrom",
    "dateTo",
];

//Access-ის ნაგულისხმევი ფილტრი: მიმდინარე თვის 1-ლიდან დღემდე (დღის ბოლომდე)
export function currentMonthToDate(now: Date = new Date()): {
    dateFrom: string;
    dateTo: string;
} {
    return {
        dateFrom: todayDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
        dateTo: todayDateInputValue(now),
    };
}

//ფილტრი ბმულის პარამეტრებშია, რომ გადახდის ფორმიდან დაბრუნებისას შენარჩუნდეს. პარამეტრების გარეშე (მენიუდან)
//ნაგულისხმევია Access-ისა: მიმდინარე თვე დღემდე
export function filterFromSearchParams(
    params: URLSearchParams,
    now: Date = new Date()
): IPaymentsListFilter {
    if (!filterKeys.some((key) => params.has(key)))
        return {
            academicYearId: "",
            studentContractId: "",
            bankAccountId: "",
            ...currentMonthToDate(now),
        };
    return {
        academicYearId: params.get("academicYearId") ?? "",
        studentContractId: params.get("studentContractId") ?? "",
        bankAccountId: params.get("bankAccountId") ?? "",
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
    };
}

//ყველა გასაღები იწერება, ცარიელიც: ასე გასუფთავებული თარიღი ნაგულისხმევ თვეს აღარ აბრუნებს
export function filterToSearchParams(
    filter: IPaymentsListFilter
): URLSearchParams {
    return new URLSearchParams({
        academicYearId: filter.academicYearId,
        studentContractId: filter.studentContractId,
        bankAccountId: filter.bankAccountId,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
    });
}

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის PaymentsListQueryFactory-ისაა)
export function buildPaymentsFilterFields(
    filter: IPaymentsListFilter
): IFilterField[] {
    return [
        { fieldName: "studentContractId", value: filter.studentContractId },
        { fieldName: "bankAccountId", value: filter.bankAccountId },
        { fieldName: "dateFrom", value: filter.dateFrom },
        { fieldName: "dateTo", value: filter.dateTo },
    ].filter((f) => f.value !== "");
}

//დაწყება დასრულებაზე გვიან: სერვერი ასეთ ფილტრს არ იღებს. "YYYY-MM-DD" სტრიქონებად შედარდება;
//ცარიელი დაწყება არცერთ თარიღზე გვიან არ არის, ცარიელი დასრულება კი შეზღუდვის არქონაა
export function isDateRangeInvalid(filter: IPaymentsListFilter): boolean {
    return filter.dateTo !== "" && filter.dateFrom > filter.dateTo;
}

//თანხა ორი ათწილადით, როგორც Access-ის ფორმაზე
export function formatAmount(value: unknown): string {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toFixed(2);
}
