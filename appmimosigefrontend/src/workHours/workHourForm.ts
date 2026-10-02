//workHourForm.ts

import type { IWorkHour, IWorkHourRequest } from "../redux/types/workHoursTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";

//ჩანაწერის ფორმის მდგომარეობა. თანამშრომელი სტრიქონადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს. whStart და whEnd
//<input type="datetime-local" step="1">-ის მნიშვნელობებია ("YYYY-MM-DDTHH:mm:ss"; ბრაუზერი 0 წამს არ წერს, ზოგი კი
//მილიწამებსაც უმატებს), whEnd ცარიელია, სანამ დასრულება არ დაფიქსირდება
export interface IWorkHourForm {
    teacherContractId: string;
    whStart: string;
    whEnd: string;
}

//"YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00", "YYYY-MM-DDTHH:mm:ss.SSS" -> "YYYY-MM-DDTHH:mm:ss"
export function withSeconds(value: string): string {
    return value.length === 16 ? `${value}:00` : value.slice(0, 19);
}

//<input type="datetime-local" step="1">-ის მნიშვნელობა წამის სიზუსტით
export function nowDateTimeInputValue(now: Date = new Date()): string {
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((part) => `${part}`.padStart(2, "0"))
        .join(":");
    return `${todayDateInputValue(now)}T${time}`;
}

//ახალი ჩანაწერი: დაწყება ახლა, დასრულება ცარიელი; თანამშრომელი სიის ფილტრიდან (თუ არჩეულია)
export function newWorkHourForm(now: string, teacherContractId = ""): IWorkHourForm {
    return { teacherContractId, whStart: now, whEnd: "" };
}

export function workHourToForm(workHour: IWorkHour): IWorkHourForm {
    return {
        teacherContractId: workHour.teacherContractId.toString(),
        whStart: workHour.whStart.slice(0, 19),
        whEnd: workHour.whEnd?.slice(0, 19) ?? "",
    };
}

export function workHourFormToRequest(form: IWorkHourForm): IWorkHourRequest {
    return {
        teacherContractId: Number(form.teacherContractId),
        whStart: withSeconds(form.whStart),
        whEnd: form.whEnd === "" ? null : withSeconds(form.whEnd),
    };
}

//დასრულება დაწყებაზე გვიან უნდა იყოს (სერვერიც ამოწმებს); ერთი ფორმატის სტრიქონები დროის რიგით დგება, ცარიელი
//დაწყება კი ყველაფერზე ადრეა
export function isEndNotAfterStart(form: IWorkHourForm): boolean {
    return form.whEnd !== "" && withSeconds(form.whEnd) <= withSeconds(form.whStart);
}
