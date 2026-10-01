//lessonsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";

//სიის ფილტრი. ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს; თარიღები "YYYY-MM-DD"-ია, ორივე ჩათვლით
export interface ILessonsListFilter {
    grpId: string;
    //მასწავლებელი ან შემცვლელი
    teacherContractId: string;
    dateFrom: string;
    dateTo: string;
    lessonStatusId: string;
    unfilled: boolean;
}

type FilterKey = keyof ILessonsListFilter;

const filterKeys: FilterKey[] = [
    "grpId",
    "teacherContractId",
    "dateFrom",
    "dateTo",
    "lessonStatusId",
    "unfilled",
];

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

//მიმდინარე კვირა: ორშაბათიდან კვირამდე
export function currentWeek(now: Date = new Date()): {
    dateFrom: string;
    dateTo: string;
} {
    const monday = addDays(now, -((now.getDay() + 6) % 7));
    return {
        dateFrom: todayDateInputValue(monday),
        dateTo: todayDateInputValue(addDays(monday, 6)),
    };
}

export function currentMonth(now: Date = new Date()): {
    dateFrom: string;
    dateTo: string;
} {
    return {
        dateFrom: todayDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
        dateTo: todayDateInputValue(
            new Date(now.getFullYear(), now.getMonth() + 1, 0)
        ),
    };
}

//ფილტრი ბმულის პარამეტრებშია, რომ გაკვეთილიდან დაბრუნებისას და ჯგუფის გვერდიდან გადმოსვლისას შენარჩუნდეს.
//პარამეტრების გარეშე (მენიუდან) ნაგულისხმევია მიმდინარე კვირა
export function filterFromSearchParams(
    params: URLSearchParams,
    now: Date = new Date()
): ILessonsListFilter {
    if (!filterKeys.some((key) => params.has(key)))
        return {
            grpId: "",
            teacherContractId: "",
            ...currentWeek(now),
            lessonStatusId: "",
            unfilled: false,
        };
    return {
        grpId: params.get("grpId") ?? "",
        teacherContractId: params.get("teacherContractId") ?? "",
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
        lessonStatusId: params.get("lessonStatusId") ?? "",
        unfilled: params.get("unfilled") === "true",
    };
}

//ყველა გასაღები იწერება, ცარიელიც: ასე გასუფთავებული თარიღი ნაგულისხმევ კვირას აღარ აბრუნებს
export function filterToSearchParams(
    filter: ILessonsListFilter
): URLSearchParams {
    return new URLSearchParams({
        grpId: filter.grpId,
        teacherContractId: filter.teacherContractId,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
        lessonStatusId: filter.lessonStatusId,
        unfilled: filter.unfilled ? "true" : "",
    });
}

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის LessonsListQueryFactory-ისაა)
export function buildLessonsFilterFields(
    filter: ILessonsListFilter
): IFilterField[] {
    return [
        { fieldName: "grpId", value: filter.grpId },
        { fieldName: "teacherContractId", value: filter.teacherContractId },
        { fieldName: "dateFrom", value: filter.dateFrom },
        { fieldName: "dateTo", value: filter.dateTo },
        { fieldName: "lessonStatusId", value: filter.lessonStatusId },
        { fieldName: "unfilled", value: filter.unfilled ? "true" : "" },
    ].filter((f) => f.value !== "");
}

//დაწყება დასრულებაზე გვიან: სერვერი ასეთ ფილტრს არ იღებს
export function isDateRangeInvalid(filter: ILessonsListFilter): boolean {
    return (
        filter.dateFrom !== "" &&
        filter.dateTo !== "" &&
        filter.dateFrom > filter.dateTo
    );
}
