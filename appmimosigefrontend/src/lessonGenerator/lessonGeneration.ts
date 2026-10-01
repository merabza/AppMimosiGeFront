//lessonGeneration.ts

import { useAppSelector } from "../appcarcass/redux/hooks";
import type {
    IGroupLessonsGeneration,
    ILessonChange,
    LessonChangeAction,
} from "../redux/types/lessonGeneratorTypes";

export const lessonGeneratorLogRoute = "lessonGeneratorLog";

//სპეციალური უფლება (AppClaim) "გადაანგარიშებისთვის": backend-ის UserMustHaveRecountAllLessonsRightFilter.ClaimKey
export const recountAllGroupsLessonsClaim = "RecountAllGroupsLessons";

//შესვლისას მიღებული უფლებები; სერვერი უფლებას ყოველ მოთხოვნაზე თავად ამოწმებს
export function useCanRecountAllGroupsLessons(): boolean {
    const user = useAppSelector((state) => state.userState.user);
    return user?.appClaims?.includes(recountAllGroupsLessonsClaim) ?? false;
}

const actionCaptions: Record<LessonChangeAction, string> = {
    create: "შეიქმნა",
    update: "შეიცვალა",
    delete: "წაიშალა",
};

export function actionCaption(action: LessonChangeAction): string {
    return actionCaptions[action];
}

//LessonChangeResponse.ChangedFields-ის გასაღებები
const fieldCaptions: Record<string, string> = {
    lessonDt: "დრო",
    teacherContractId: "მასწავლებელი",
    salarySchemaId: "ხელფასის სქემა",
    fourWeekHours: "4 კვირის საათები",
    teoMinDate: "თვის თეორიული პირველი გაკვეთილი",
    teoMaxDate: "თვის თეორიული ბოლო გაკვეთილი",
};

//"დრო, მასწავლებელი; მოსწავლეები: +1 ~2 −1"
export function changeDetails(change: ILessonChange): string {
    const fields = change.changedFields
        .map((field) => fieldCaptions[field] ?? field)
        .join(", ");
    const students = [
        change.addedStudentsCount > 0 ? `+${change.addedStudentsCount}` : "",
        change.updatedStudentsCount > 0 ? `~${change.updatedStudentsCount}` : "",
        change.deletedStudentsCount > 0 ? `−${change.deletedStudentsCount}` : "",
    ]
        .filter((part) => part !== "")
        .join(" ");
    return [fields, students === "" ? "" : `მოსწავლეები: ${students}`]
        .filter((part) => part !== "")
        .join("; ");
}

//"შეიქმნა 3, შეიცვალა 1, წაიშალა 0 გაკვეთილი; მოსწავლეები: დაემატა 1, შეიცვალა 0, წაიშალა 0"
export function groupSummary(group: IGroupLessonsGeneration): string {
    const lessons = `შეიქმნა ${group.createdLessonsCount}, შეიცვალა ${group.updatedLessonsCount}, წაიშალა ${group.deletedLessonsCount} გაკვეთილი`;
    const students = `მოსწავლეები: დაემატა ${group.addedStudentsCount}, შეიცვალა ${group.updatedStudentsCount}, წაიშალა ${group.deletedStudentsCount}`;
    return `${lessons}; ${students}`;
}

export function hasChangesOrErrors(group: IGroupLessonsGeneration): boolean {
    return group.changes.length > 0 || group.errors.length > 0;
}
