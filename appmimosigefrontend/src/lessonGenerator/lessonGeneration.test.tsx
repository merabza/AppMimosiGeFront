//lessonGeneration.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createGroupsStore } from "../testUtils/groupsTestStore";
import { changedGroup, groupGeneration } from "../testUtils/lessonGeneratorTestData";
import {
    actionCaption,
    changeDetails,
    groupSummary,
    hasChangesOrErrors,
    useCanRecountAllGroupsLessons,
} from "./lessonGeneration";

describe("actionCaption", () => {
    it.each([
        ["create", "შეიქმნა"],
        ["update", "შეიცვალა"],
        ["delete", "წაიშალა"],
    ] as const)("%s is %s", (action, caption) => {
        expect(actionCaption(action)).toBe(caption);
    });
});

describe("changeDetails", () => {
    it("names the changed fields and counts the student rows", () => {
        expect(changeDetails(changedGroup.changes[1])).toBe(
            "დრო, თვის თეორიული პირველი გაკვეთილი; მოსწავლეები: −1"
        );
    });

    it("lists every field and every kind of student change", () => {
        expect(
            changeDetails({
                ...changedGroup.changes[1],
                changedFields: [
                    "teacherContractId",
                    "salarySchemaId",
                    "fourWeekHours",
                    "teoMaxDate",
                    "unknownField",
                ],
                addedStudentsCount: 2,
                updatedStudentsCount: 1,
                deletedStudentsCount: 0,
            })
        ).toBe(
            "მასწავლებელი, ხელფასის სქემა, 4 კვირის საათები, თვის თეორიული ბოლო გაკვეთილი, unknownField; მოსწავლეები: +2 ~1"
        );
    });

    it("is empty for a new lesson", () => {
        expect(changeDetails(changedGroup.changes[0])).toBe("");
    });

    it("has only the students when no lesson field changed", () => {
        expect(
            changeDetails({ ...changedGroup.changes[1], changedFields: [], addedStudentsCount: 1 })
        ).toBe("მოსწავლეები: +1 −1");
    });
});

describe("groupSummary", () => {
    it("counts the lessons and the student rows", () => {
        expect(groupSummary(changedGroup)).toBe(
            "შეიქმნა 1, შეიცვალა 1, წაიშალა 0 გაკვეთილი; მოსწავლეები: დაემატა 0, შეიცვალა 0, წაიშალა 1"
        );
    });
});

describe("hasChangesOrErrors", () => {
    it("is true for changes or errors only", () => {
        expect(hasChangesOrErrors(changedGroup)).toBe(true);
        expect(hasChangesOrErrors(groupGeneration({ errors: changedGroup.errors }))).toBe(true);
        expect(hasChangesOrErrors(groupGeneration({ changes: changedGroup.changes }))).toBe(true);
        expect(hasChangesOrErrors(groupGeneration())).toBe(false);
    });
});

describe("useCanRecountAllGroupsLessons", () => {
    function canRecount(appClaims?: string[]) {
        const store = createGroupsStore("withRight", appClaims);
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        return renderHook(() => useCanRecountAllGroupsLessons(), { wrapper }).result.current;
    }

    it("is true only with the special right", () => {
        expect(canRecount(["RecountAllGroupsLessons"])).toBe(true);
        expect(canRecount(["SomethingElse"])).toBe(false);
        expect(canRecount([])).toBe(false);
        expect(canRecount()).toBe(false);
    });
});
