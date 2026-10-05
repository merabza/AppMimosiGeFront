//newAcademicYearWizard.ts

import type { IAcademicYearInfo, ICloseAcademicYearGroups } from "../redux/types/academicYearTypes";

//გენერატორის შეცდომა 11: გაკვეთილი ზედმეტია, მაგრამ შეტანილი მონაცემის გამო არ წაიშალა (D73)
export const extraLessonWithDataErrorCode = 11;

//დასახურავი წელი ნაგულისხმევად: ბოლოს წინა (ოსტატი ჯერ ახალ წელს ამატებს, შემდეგ წინას ხურავს); ერთი წლისას ის
export function defaultYearToClose(academicYears: IAcademicYearInfo[]): IAcademicYearInfo | undefined {
    const ordered = [...academicYears].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return ordered.length > 1 ? ordered[ordered.length - 2] : ordered[0];
}

export interface ICloseGroupsTotals {
    groupsCount: number;
    deletedLessonsCount: number;
    keptLessonsCount: number;
    deletedLessonsCharges: number;
    openRowsCount: number;
}

//ჯგუფების დახურვის ჯამები: წასაშლელი გაკვეთილები, შეტანილი მონაცემით დარჩენილები, წასაშლელების დარიცხვა და
//დაუსრულებელი სტრიქონები
export function closeGroupsTotals(result: ICloseAcademicYearGroups): ICloseGroupsTotals {
    return result.groups.reduce<ICloseGroupsTotals>(
        (totals, group) => ({
            groupsCount: totals.groupsCount + 1,
            deletedLessonsCount: totals.deletedLessonsCount + group.generation.deletedLessonsCount,
            keptLessonsCount:
                totals.keptLessonsCount +
                group.generation.errors.filter((e) => e.errorCode === extraLessonWithDataErrorCode).length,
            deletedLessonsCharges: totals.deletedLessonsCharges + group.deletedLessonsCharges,
            openRowsCount:
                totals.openRowsCount +
                group.openTeacherRowsCount +
                group.openStudentRowsCount +
                group.openScheduleRowsCount,
        }),
        { groupsCount: 0, deletedLessonsCount: 0, keptLessonsCount: 0, deletedLessonsCharges: 0, openRowsCount: 0 }
    );
}
