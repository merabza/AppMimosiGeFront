//lessonForm.ts

import type {
    ILesson,
    ILessonRequest,
    ILessonStudent,
} from "../redux/types/lessonsTypes";
import { toDateInputValue } from "../studentContracts/dateFormat";

//ფორმის მდგომარეობა. რიცხვითი, თარიღის და ჩამოსაშლელი ველები სტრიქონებადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს.
//მოსწავლის სახელი და საათები მხოლოდ საჩვენებელია

export interface ILessonStudentFormRow {
    id: number;
    studentName: string;
    hoursCount: number;
    present: boolean;
    theme: string;
    rate: string;
    teacherComment: string;
    studentComment: string;
    studentLateMinutes: string;
}

export interface ILessonForm {
    lessonStatusId: string;
    substituteTeacherContractId: string;
    teacherLateMinutes: string;
    recoverDate: string;
    note: string;
    students: ILessonStudentFormRow[];
}

function studentToFormRow(student: ILessonStudent): ILessonStudentFormRow {
    return {
        id: student.id,
        studentName: student.studentName,
        hoursCount: student.hoursCount,
        present: student.present,
        theme: student.theme ?? "",
        rate: student.rate?.toString() ?? "",
        teacherComment: student.teacherComment ?? "",
        studentComment: student.studentComment ?? "",
        studentLateMinutes: student.studentLateMinutes.toString(),
    };
}

export function lessonToForm(lesson: ILesson): ILessonForm {
    return {
        lessonStatusId: lesson.lessonStatusId.toString(),
        substituteTeacherContractId:
            lesson.substituteTeacherContractId?.toString() ?? "",
        teacherLateMinutes: lesson.teacherLateMinutes.toString(),
        recoverDate: toDateInputValue(lesson.recoverDate),
        note: lesson.note ?? "",
        students: lesson.students.map(studentToFormRow),
    };
}

//ცარიელი ტექსტი null-ად იგზავნება (სერვერიც ასე ინახავს); ცარიელი წუთები 0-ია
function textOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

function numberOrNull(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
}

export function lessonFormToRequest(form: ILessonForm): ILessonRequest {
    return {
        lessonStatusId: Number(form.lessonStatusId),
        substituteTeacherContractId: numberOrNull(
            form.substituteTeacherContractId
        ),
        teacherLateMinutes: numberOrNull(form.teacherLateMinutes) ?? 0,
        recoverDate: form.recoverDate === "" ? null : form.recoverDate,
        note: textOrNull(form.note),
        students: form.students.map((row) => ({
            id: row.id,
            present: row.present,
            theme: textOrNull(row.theme),
            rate: numberOrNull(row.rate),
            teacherComment: textOrNull(row.teacherComment),
            studentComment: textOrNull(row.studentComment),
            studentLateMinutes: numberOrNull(row.studentLateMinutes) ?? 0,
        })),
    };
}

//სწრაფი შეტანა: ყველა მოსწავლე დამსწრეა
export function markAllPresent(
    rows: ILessonStudentFormRow[]
): ILessonStudentFormRow[] {
    return rows.map((row) => (row.present ? row : { ...row, present: true }));
}

//შეტანილი მონაცემის გასუფთავება (Q17): ასეთ ზედმეტ სტრიქონს გენერატორი შემდეგ გაშვებაზე თვითონ წაშლის
export function clearStudentRow(
    row: ILessonStudentFormRow
): ILessonStudentFormRow {
    return {
        ...row,
        present: false,
        theme: "",
        rate: "",
        teacherComment: "",
        studentComment: "",
        studentLateMinutes: "0",
    };
}

//გენერატორის შეტანილი მონაცემი (D65): დასწრება, თემა, შეფასება ან კომენტარი
export function hasEnteredData(row: ILessonStudentFormRow): boolean {
    return (
        row.present ||
        [row.theme, row.rate, row.teacherComment, row.studentComment].some(
            (value) => value.trim() !== ""
        )
    );
}
