//teacherContractForm.ts

import type {
    ITeacherContract,
    ITeacherContractRequest,
} from "../redux/types/teacherContractsTypes";
import { toDateInputValue } from "../studentContracts/dateFormat";

//ფორმის მდგომარეობა. რიცხვითი და ჩამოსაშლელი ველები სტრიქონებადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს

export interface ITeacherContractForm {
    contractNumber: string;
    contractDate: string;
    teacherHumanId: number;
    teacherName: string;
    bankAccount: string;
    bankAccountCode: string;
    pensionScheme: boolean;
    indEnt: boolean;
    rsQuoteTypeId: string;
    rsCountryId: string;
    fixedAmount: string;
    nextMonth: boolean;
    description: string;
    salarySchemaByHoursId: string;
    workHourGroupId: string;
    workHoursStart: string;
    workHoursEnd: string;
    contractEndDate: string;
}

//Access-ის ნაგულისხმევი მნიშვნელობები: ფიქსირებული თანხა 0, ალმები გამორთული
export function newTeacherContractForm(today: string): ITeacherContractForm {
    return {
        contractNumber: "",
        contractDate: today,
        teacherHumanId: 0,
        teacherName: "",
        bankAccount: "",
        bankAccountCode: "",
        pensionScheme: false,
        indEnt: false,
        rsQuoteTypeId: "",
        rsCountryId: "",
        fixedAmount: "0",
        nextMonth: false,
        description: "",
        salarySchemaByHoursId: "",
        workHourGroupId: "",
        workHoursStart: "",
        workHoursEnd: "",
        contractEndDate: "",
    };
}

//<input type="time">-ის მნიშვნელობა "HH:mm"; API დროს "HH:mm:ss"-ით აბრუნებს
export function toTimeInputValue(value?: string | null): string {
    return value ? value.slice(0, 5) : "";
}

function toRequestTime(value: string): string | null {
    if (value === "") return null;
    return value.length === 5 ? `${value}:00` : value;
}

function idToString(id: number | null): string {
    return id?.toString() ?? "";
}

export function teacherContractToForm(
    contract: ITeacherContract
): ITeacherContractForm {
    return {
        contractNumber: contract.contractNumber,
        contractDate: toDateInputValue(contract.contractDate),
        teacherHumanId: contract.teacherHumanId,
        teacherName: contract.teacherName,
        bankAccount: contract.bankAccount ?? "",
        bankAccountCode: contract.bankAccountCode ?? "",
        pensionScheme: contract.pensionScheme,
        indEnt: contract.indEnt,
        rsQuoteTypeId: idToString(contract.rsQuoteTypeId),
        rsCountryId: idToString(contract.rsCountryId),
        fixedAmount: contract.fixedAmount.toString(),
        nextMonth: contract.nextMonth,
        description: contract.description ?? "",
        salarySchemaByHoursId: idToString(contract.salarySchemaByHoursId),
        workHourGroupId: idToString(contract.workHourGroupId),
        workHoursStart: toTimeInputValue(contract.workHoursStart),
        workHoursEnd: toTimeInputValue(contract.workHoursEnd),
        contractEndDate: toDateInputValue(contract.contractEndDate),
    };
}

function toNumber(value: string): number {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalId(value: string): number | null {
    return value === "" ? null : toNumber(value);
}

function toOptionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

export function teacherContractFormToRequest(
    form: ITeacherContractForm
): ITeacherContractRequest {
    return {
        contractNumber: form.contractNumber.trim(),
        contractDate: form.contractDate,
        teacherHumanId: form.teacherHumanId,
        bankAccount: toOptionalText(form.bankAccount),
        bankAccountCode: toOptionalText(form.bankAccountCode),
        pensionScheme: form.pensionScheme,
        indEnt: form.indEnt,
        rsQuoteTypeId: toOptionalId(form.rsQuoteTypeId),
        rsCountryId: toNumber(form.rsCountryId),
        fixedAmount: toNumber(form.fixedAmount),
        nextMonth: form.nextMonth,
        description: toOptionalText(form.description),
        salarySchemaByHoursId: toOptionalId(form.salarySchemaByHoursId),
        workHourGroupId: toOptionalId(form.workHourGroupId),
        workHoursStart: toRequestTime(form.workHoursStart),
        workHoursEnd: toRequestTime(form.workHoursEnd),
        contractEndDate: form.contractEndDate === "" ? null : form.contractEndDate,
    };
}
