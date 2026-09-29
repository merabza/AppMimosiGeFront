//studentContractsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის StudentContractsListQueryFactory-ისაა).
//ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს
export function buildFilterFields(
    academicYearId: string,
    studentStatusId: string,
    search: string
): IFilterField[] {
    return [
        { fieldName: "academicYearId", value: academicYearId },
        { fieldName: "studentStatusId", value: studentStatusId },
        { fieldName: "search", value: search.trim() },
    ].filter((f) => f.value !== "");
}
