//lessonGeneratorTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა)

//lessonDate ჯგუფის დონის შეცდომებზე (1–3) ცარიელია, lessonId მხოლოდ არსებული გაკვეთილის შეცდომებს აქვს (11, 14)
export interface ILessonGeneratorError {
    errorCode: number;
    errorText: string;
    lessonDate: string | null;
    lessonId: number | null;
}

export type LessonChangeAction = "create" | "update" | "delete";

//update-ში changedFields გაკვეთილის შეცვლილი ველებია (ცარიელი, თუ მხოლოდ მოსწავლეები შეიცვალა);
//მოსწავლეების რაოდენობები არსებული გაკვეთილის მოსწავლეების სტრიქონებს ითვლის
export interface ILessonChange {
    action: LessonChangeAction;
    lessonId: number | null;
    lessonDt: string;
    previousLessonDt: string | null;
    changedFields: string[];
    addedStudentsCount: number;
    updatedStudentsCount: number;
    deletedStudentsCount: number;
}

export interface IGroupLessonsGeneration {
    grpId: number;
    groupCode: string;
    createdLessonsCount: number;
    updatedLessonsCount: number;
    deletedLessonsCount: number;
    addedStudentsCount: number;
    updatedStudentsCount: number;
    deletedStudentsCount: number;
    dirtyStudentContractsCount: number;
    errors: ILessonGeneratorError[];
    changes: ILessonChange[];
}

//horizonEnd: ბოლო სამუშაო თვის ბოლო დღე, რომლამდეც გაკვეთილები იქმნება
export interface ILessonsGeneration {
    dryRun: boolean;
    horizonEnd: string;
    addedOperationMonthsCount: number;
    groups: IGroupLessonsGeneration[];
}

//lessonId ცარიელია, თუ ჯგუფს დღემდე გაკვეთილის დღე არ ჰქონია
export interface IGroupLastLesson {
    lessonId: number | null;
    lessonDt: string | null;
    generation: ILessonsGeneration;
}

export interface ILessonGeneratorLogRow {
    id: number;
    createdDate: string;
    grpId: number;
    groupCode: string;
    errorCode: number;
    errorText: string;
    lessonDate: string | null;
    lessonId: number | null;
}
