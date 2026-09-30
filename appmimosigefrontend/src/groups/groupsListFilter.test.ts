//groupsListFilter.test.ts

import { describe, expect, it } from "vitest";
import { buildGroupsFilterFields, type IGroupsListFilter } from "./groupsListFilter";

const empty: IGroupsListFilter = {
    findMethod: "group",
    academicYearId: "",
    state: "",
    courseId: "",
    groupSizeId: "",
    studentStatusId: "",
    search: "",
};

describe("buildGroupsFilterFields", () => {
    it("sends only the find method when nothing else is chosen", () => {
        expect(buildGroupsFilterFields(empty)).toEqual([
            { fieldName: "findMethod", value: "group" },
        ]);
    });

    it("sends every chosen filter with the names of GroupsListQueryFactory", () => {
        expect(
            buildGroupsFilterFields({
                findMethod: "student",
                academicYearId: "11",
                state: "voided",
                courseId: "6",
                groupSizeId: "2",
                studentStatusId: "10",
                search: "  ბერი ",
            })
        ).toEqual([
            { fieldName: "findMethod", value: "student" },
            { fieldName: "academicYearId", value: "11" },
            { fieldName: "state", value: "voided" },
            { fieldName: "courseId", value: "6" },
            { fieldName: "groupSizeId", value: "2" },
            { fieldName: "studentStatusId", value: "10" },
            { fieldName: "search", value: "ბერი" },
        ]);
    });

    it("drops a search of spaces only", () => {
        expect(
            buildGroupsFilterFields({ ...empty, findMethod: "teacher", search: "   " })
        ).toEqual([{ fieldName: "findMethod", value: "teacher" }]);
    });
});
