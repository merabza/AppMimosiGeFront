//salaryForm.ts

import type {
    ISalaryHeader,
    ISalaryHeaderRequest,
    ISalaryLine,
    ISalaryPart,
    ISalaryPartRequest,
    ISalaryPartType,
} from "../redux/types/salaryTypes";
import { toDateInputValue } from "../studentContracts/dateFormat";

//ჩატარებული გაკვეთილების ხელფასი: მხოლოდ გამოთვლა ქმნის
export const lessonSalaryPartTypeId = 1;
const deductionCountPlaceId = 2;

//უწყისის თარიღები <input type="date">-ის მნიშვნელობებით ("YYYY-MM-DD")
export interface ISalaryHeaderForm {
    shChargeDate: string;
    shTransferDate: string;
}

//ახალი უწყისი: მიმდინარე თვის 5 რიცხვი, ანუ წინა თვის ჩატარებული გაკვეთილების ხელფასის დარიცხვის თარიღი
export function newSalaryHeaderForm(now: Date = new Date()): ISalaryHeaderForm {
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const fifth = `${now.getFullYear()}-${month}-05`;
    return { shChargeDate: fifth, shTransferDate: fifth };
}

export function salaryHeaderToForm(header: ISalaryHeader): ISalaryHeaderForm {
    return {
        shChargeDate: toDateInputValue(header.shChargeDate),
        shTransferDate: toDateInputValue(header.shTransferDate),
    };
}

export function salaryHeaderFormToRequest(form: ISalaryHeaderForm): ISalaryHeaderRequest {
    return { shChargeDate: form.shChargeDate, shTransferDate: form.shTransferDate };
}

//მდგენელის ფორმა: ველები ტექსტად, როგორც <select>/<input>-ში
export interface ISalaryPartForm {
    teacherContractId: string;
    salaryPartTypeId: string;
    spAmount: string;
}

export const emptySalaryPartForm: ISalaryPartForm = {
    teacherContractId: "",
    salaryPartTypeId: "",
    spAmount: "",
};

export function salaryPartToForm(part: ISalaryPart): ISalaryPartForm {
    return {
        teacherContractId: String(part.teacherContractId),
        salaryPartTypeId: part.salaryPartTypeId === null ? "" : String(part.salaryPartTypeId),
        spAmount: String(part.spAmount),
    };
}

export function salaryPartFormToRequest(form: ISalaryPartForm): ISalaryPartRequest {
    return {
        teacherContractId: Number(form.teacherContractId),
        salaryPartTypeId: Number(form.salaryPartTypeId),
        spAmount: Number(form.spAmount),
    };
}

//ხელით შესატანი ტიპები: ტიპი 1-ის გარდა ყველა
export function manualPartTypes(types: ISalaryPartType[]): ISalaryPartType[] {
    return types.filter((t) => t.id !== lessonSalaryPartTypeId);
}

export function isDeductionType(types: ISalaryPartType[], typeId: string): boolean {
    return types.some((t) => String(t.id) === typeId && t.countPlaceId === deductionCountPlaceId);
}

//გამოქვითვა დადებითი თანხით იწერება (D104), დანარჩენი ნებისმიერი რიცხვით
export function isPartAmountInvalid(form: ISalaryPartForm, types: ISalaryPartType[]): boolean {
    if (form.spAmount.trim() === "" || Number.isNaN(Number(form.spAmount))) return true;
    return isDeductionType(types, form.salaryPartTypeId) && Number(form.spAmount) <= 0;
}

export function isPartCalculated(part: ISalaryPart): boolean {
    return part.salaryPartTypeId === lessonSalaryPartTypeId;
}

//მდგენელის წაშლის კითხვა: თანამშრომელი, ტიპი (ტიპის გარეშე ცარიელი) და თანხა
export function salaryPartDeleteQuestion(part: ISalaryPart): string {
    return `დარწმუნებული ხართ, რომ გსურთ წაშალოთ მდგენელი: ${part.employeeName}, ${
        part.salaryPartTypeName ?? ""
    }, ${formatMoney(part.spAmount)}?`;
}

export interface ISalaryLineTotals {
    saNetAmountRound: number;
    saAmountGross: number;
    saPension2: number;
    saGrossMinusPension: number;
    saIncomeTax: number;
    saGamokvitva: number;
    saPension4: number;
    saAmountNet: number;
    saIndividualIncomeTax: number;
    //Access-ის ფორმის "სულ": გადასარიცხი + საშემოსავლო + საპენსიოს 4%
    total: number;
}

//თანხები 4 ათწილადამდეა, ამიტომ ჯამი მეათასედებში ითვლება, რომ ათწილადის ცდომილება არ დაგროვდეს
function sum(lines: ISalaryLine[], value: (line: ISalaryLine) => number): number {
    return lines.reduce((total, line) => total + Math.round(value(line) * 10000), 0) / 10000;
}

export function salaryLineTotals(lines: ISalaryLine[]): ISalaryLineTotals {
    const totals = {
        saNetAmountRound: sum(lines, (l) => l.saNetAmountRound),
        saAmountGross: sum(lines, (l) => l.saAmountGross),
        saPension2: sum(lines, (l) => l.saPension2),
        saGrossMinusPension: sum(lines, (l) => l.saGrossMinusPension),
        saIncomeTax: sum(lines, (l) => l.saIncomeTax),
        saGamokvitva: sum(lines, (l) => l.saGamokvitva),
        saPension4: sum(lines, (l) => l.saPension4),
        saAmountNet: sum(lines, (l) => l.saAmountNet),
        saIndividualIncomeTax: sum(lines, (l) => l.saIndividualIncomeTax),
    };
    return {
        ...totals,
        total: sum(lines, (l) => l.saAmountNet + l.saIncomeTax + l.saPension4),
    };
}

//დეკლარაციის თვე <input type="month">-ით ("YYYY-MM"); ნაგულისხმევად წინა თვე (Access-ის ფორმის ნაგულისხმევი)
export function previousMonthInputValue(now: Date = new Date()): string {
    const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

//"2026-09" -> "2026-09-01"
export function monthToRequest(month: string): string {
    return `${month}-01`;
}

//სერვერის სახელები (SalaryFilesGenerator): წინა ნულების გარეშე
export function transferFileName(transferDate: string): string {
    const [year, month, day] = transferDate.slice(0, 10).split("-").map(Number);
    return `salary_${year}_${month}_${day}.csv`;
}

export function declarationFileName(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number);
    return `TaxDepDeclaration_${year}_${monthNumber}.csv`;
}

//თანხა ორი ათწილადით, როგორც Access-ის ფორმაზე
export function formatMoney(value: number): string {
    return value.toFixed(2);
}

//"2026-09-01T00:00:00" -> "09.2026"
export function formatMonth(value: string): string {
    return `${value.slice(5, 7)}.${value.slice(0, 4)}`;
}
