//groupsListFilter.ts

import type { IFilterField } from "../appcarcass/grid/GridViewTypes";
import type { GroupFindMethod, GroupState } from "../redux/types/groupsTypes";

export interface IGroupsListFilter {
    findMethod: GroupFindMethod;
    academicYearId: string;
    state: GroupState;
    courseId: string;
    groupSizeId: string;
    studentStatusId: string;
    search: string;
}

//სიის ფილტრი GridView-ის filterFields-ად (სახელები backend-ის GroupsListQueryFactory-ისაა).
//ცარიელი მნიშვნელობა ფილტრის არქონას ნიშნავს
export function buildGroupsFilterFields(
    filter: IGroupsListFilter
): IFilterField[] {
    return [
        { fieldName: "findMethod", value: filter.findMethod },
        { fieldName: "academicYearId", value: filter.academicYearId },
        { fieldName: "state", value: filter.state },
        { fieldName: "courseId", value: filter.courseId },
        { fieldName: "groupSizeId", value: filter.groupSizeId },
        { fieldName: "studentStatusId", value: filter.studentStatusId },
        { fieldName: "search", value: filter.search.trim() },
    ].filter((f) => f.value !== "");
}
