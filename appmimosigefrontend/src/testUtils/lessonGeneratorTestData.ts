//lessonGeneratorTestData.ts

import type {
    IGroupLessonsGeneration,
    ILessonsGeneration,
} from "../redux/types/lessonGeneratorTypes";

// a group result without changes or errors
export function groupGeneration(
    overrides: Partial<IGroupLessonsGeneration> = {}
): IGroupLessonsGeneration {
    return {
        grpId: 7,
        groupCode: "1001",
        createdLessonsCount: 0,
        updatedLessonsCount: 0,
        deletedLessonsCount: 0,
        addedStudentsCount: 0,
        updatedStudentsCount: 0,
        deletedStudentsCount: 0,
        dirtyStudentContractsCount: 0,
        errors: [],
        changes: [],
        ...overrides,
    };
}

// group 7 got a new lesson, its lesson 100 moved to another time and lost a student, and day 21 had no teacher
export const changedGroup = groupGeneration({
    createdLessonsCount: 1,
    updatedLessonsCount: 1,
    deletedStudentsCount: 1,
    dirtyStudentContractsCount: 2,
    errors: [
        {
            errorCode: 6,
            errorText: "ამ დღეს არცერთი მასწავლებლის არ არის მითითებული",
            lessonDate: "2026-09-21T00:00:00",
            lessonId: null,
        },
    ],
    changes: [
        {
            action: "create",
            lessonId: 501,
            lessonDt: "2026-09-14T15:00:00",
            previousLessonDt: null,
            changedFields: [],
            addedStudentsCount: 0,
            updatedStudentsCount: 0,
            deletedStudentsCount: 0,
        },
        {
            action: "update",
            lessonId: 100,
            lessonDt: "2026-09-28T15:00:00",
            previousLessonDt: "2026-09-28T14:30:00",
            changedFields: ["lessonDt", "teoMinDate"],
            addedStudentsCount: 0,
            updatedStudentsCount: 0,
            deletedStudentsCount: 1,
        },
    ],
});

export function generation(
    groups: IGroupLessonsGeneration[],
    addedOperationMonthsCount = 0
): ILessonsGeneration {
    return {
        dryRun: false,
        horizonEnd: "2027-11-30T00:00:00",
        addedOperationMonthsCount,
        groups,
    };
}
