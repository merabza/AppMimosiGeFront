//crmCallsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import { crmCallsMenuKey } from "./crmCallsMenu";

//სიის ფილტრი: კონტრაქტი, ზარის თარიღის შუალედი ("YYYY-MM-DD", ორივე ჩათვლით), ტიპი, შედეგი. ცარიელი მნიშვნელობა
//ფილტრის არქონას ნიშნავს. academicYearId მხოლოდ მოსწავლის (კონტრაქტის) ასარჩევ სიას ზღუდავს და თავად ზარებს არ
//ფილტრავს; ცარიელი მიმდინარე წელს ნიშნავს
export interface ICrmCallsListFilter {
    academicYearId: string;
    studentContractId: string;
    dateFrom: string;
    dateTo: string;
    callTypeId: string;
    answerTypeId: string;
}

const filterKeys: (keyof ICrmCallsListFilter)[] = [
    "academicYearId",
    "studentContractId",
    "dateFrom",
    "dateTo",
    "callTypeId",
    "answerTypeId",
];

//ფილტრი ბმულის პარამეტრებშია, რომ ზარის ფორმიდან დაბრუნებისას შენარჩუნდეს. პარამეტრების გარეშე (მენიუდან) ყველა
//ზარი ჩანს, როგორც Access-ის ფორმაში
export function filterFromSearchParams(params: URLSearchParams): ICrmCallsListFilter {
    return {
        academicYearId: params.get("academicYearId") ?? "",
        studentContractId: params.get("studentContractId") ?? "",
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
        callTypeId: params.get("callTypeId") ?? "",
        answerTypeId: params.get("answerTypeId") ?? "",
    };
}

//ცარიელი მნიშვნელობა ბმულში არ იწერება
export function filterToSearchParams(filter: ICrmCallsListFilter): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of filterKeys) if (filter[key] !== "") params.set(key, filter[key]);
    return params;
}

//კონტრაქტის ყველა ზარი სიაში
export function contractCrmCallsUrl(studentContractId: number, academicYearId: number): string {
    const params = filterToSearchParams({
        academicYearId: academicYearId.toString(),
        studentContractId: studentContractId.toString(),
        dateFrom: "",
        dateTo: "",
        callTypeId: "",
        answerTypeId: "",
    });
    return `/${crmCallsMenuKey}?${params.toString()}`;
}

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის CrmCallsListQueryFactory-ისაა)
export function buildCrmCallsFilterFields(filter: ICrmCallsListFilter): IFilterField[] {
    return [
        { fieldName: "studentContractId", value: filter.studentContractId },
        { fieldName: "dateFrom", value: filter.dateFrom },
        { fieldName: "dateTo", value: filter.dateTo },
        { fieldName: "callTypeId", value: filter.callTypeId },
        { fieldName: "answerTypeId", value: filter.answerTypeId },
    ].filter((f) => f.value !== "");
}

//დაწყება დასრულებაზე გვიან: სერვერი ასეთ ფილტრს არ იღებს. "YYYY-MM-DD" სტრიქონებად შედარდება; ცარიელი დაწყება
//არცერთ თარიღზე გვიან არ არის, ცარიელი დასრულება კი შეზღუდვის არქონაა
export function isDateRangeInvalid(filter: ICrmCallsListFilter): boolean {
    return filter.dateTo !== "" && filter.dateFrom > filter.dateTo;
}

//საუბრის შინაარსი სიაში შემოკლებით: ერთ ხაზად, მაქსიმუმ maxLength სიმბოლო
export function shortenText(value: unknown, maxLength = 60): string {
    if (typeof value !== "string") return "";
    const text = value.replace(/\s+/g, " ").trim();
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
