//crmCallForm.ts

import type { ICrmCall, ICrmCallRequest } from "../redux/types/crmCallsTypes";
import { toDateInputValue, todayDateInputValue } from "../studentContracts/dateFormat";

//ზარის ფორმის მდგომარეობა. ჩამოსაშლელი ველები სტრიქონებადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს. callDate
//<input type="datetime-local">-ის მნიშვნელობაა ("YYYY-MM-DDTHH:mm"), mustPayDate <input type="date">-ისა.
//academicYearId კონტრაქტის ასარჩევი სიის წელია და მოთხოვნაში არ იგზავნება
export interface ICrmCallForm {
    academicYearId: string;
    studentContractId: string;
    callTypeId: string;
    callDate: string;
    answerTypeId: string;
    callConversation: string;
    mustPayDate: string;
}

//Access-ის crmCalls.CallType-ის ნაგულისხმევი ("სწავლის საფასურის გადახდის შეხსენება")
export const defaultCallTypeId = "1";

//<input type="datetime-local">-ის მნიშვნელობა წუთის სიზუსტით (ბრაუზერის ნაგულისხმევი step წამებს არ იღებს)
export function nowDateTimeInputValue(now: Date = new Date()): string {
    const hours = `${now.getHours()}`.padStart(2, "0");
    const minutes = `${now.getMinutes()}`.padStart(2, "0");
    return `${todayDateInputValue(now)}T${hours}:${minutes}`;
}

//ახალი ზარი: ტიპი ნაგულისხმევი, თარიღი ახლა (Access-ის Now()); შედეგი შესავსებია
export function newCrmCallForm(
    now: string,
    academicYearId: string,
    studentContractId = ""
): ICrmCallForm {
    return {
        academicYearId,
        studentContractId,
        callTypeId: defaultCallTypeId,
        callDate: now,
        answerTypeId: "",
        callConversation: "",
        mustPayDate: "",
    };
}

export function crmCallToForm(crmCall: ICrmCall): ICrmCallForm {
    return {
        academicYearId: crmCall.academicYearId.toString(),
        studentContractId: crmCall.studentContractId.toString(),
        callTypeId: crmCall.callTypeId.toString(),
        callDate: crmCall.callDate.slice(0, 16),
        answerTypeId: crmCall.answerTypeId.toString(),
        callConversation: crmCall.callConversation ?? "",
        mustPayDate: toDateInputValue(crmCall.mustPayDate),
    };
}

export function crmCallFormToRequest(form: ICrmCallForm): ICrmCallRequest {
    const callConversation = form.callConversation.trim();
    return {
        studentContractId: Number(form.studentContractId),
        callTypeId: Number(form.callTypeId),
        callDate: `${form.callDate}:00`,
        answerTypeId: form.answerTypeId === "" ? null : Number(form.answerTypeId),
        callConversation: callConversation === "" ? null : callConversation,
        mustPayDate: form.mustPayDate === "" ? null : form.mustPayDate,
    };
}
