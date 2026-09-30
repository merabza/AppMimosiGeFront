//teacherContractsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის TeacherContractsListQueryFactory-ისაა).
//activeOnly: მხოლოდ კონტრაქტები, რომლებიც ჯერ არ დასრულებულა. ცარიელი ძებნა არ იგზავნება
export function buildFilterFields(
    activeOnly: boolean,
    search: string
): IFilterField[] {
    return [
        { fieldName: "activeOnly", value: activeOnly ? "true" : "" },
        { fieldName: "search", value: search.trim() },
    ].filter((f) => f.value !== "");
}
