//contractForm.ts

import type {
    IStudentContract,
    IStudentContractRequest,
} from "../redux/types/studentContractsTypes";
import {
    afterFourWeekFeeChange,
    afterHoursOrOneHourFeeChange,
} from "./feeCalculation";
import { toDateInputValue } from "./dateFormat";

//ფორმის მდგომარეობა. რიცხვითი ველები სტრიქონებადაა, რომ აკრეფისას "7." და ცარიელი მნიშვნელობა არ დაიკარგოს

export interface IDetailFormRow {
    key: number; //React-ის key; ახალ დეტალს id 0 აქვს
    id: number;
    courseId: string;
    groupSizeId: string;
    fourWeekHours: string;
    fourWeekFee: string;
    oneHourFee: string;
}

export interface IContractForm {
    contractNumber: string;
    contractDate: string;
    studentHumanId: number;
    studentName: string;
    payerHumanId: number;
    payerName: string;
    academicYearId: string;
    studentStatusId: string;
    desiredMonthlyPaymentDay: string;
    details: IDetailFormRow[];
}

export type FeeField = "fourWeekHours" | "fourWeekFee" | "oneHourFee";

let nextRowKey = 1;

//ახალი დეტალის ნაგულისხმევი მნიშვნელობები Access-ისაა: 8 საათი, 48 და 6
export function newDetailRow(): IDetailFormRow {
    return {
        key: nextRowKey++,
        id: 0,
        courseId: "",
        groupSizeId: "",
        fourWeekHours: "8",
        fourWeekFee: "48",
        oneHourFee: "6",
    };
}

export function newContractForm(
    today: string,
    academicYearId: number | null
): IContractForm {
    return {
        contractNumber: "",
        contractDate: today,
        studentHumanId: 0,
        studentName: "",
        payerHumanId: 0,
        payerName: "",
        academicYearId: academicYearId?.toString() ?? "",
        studentStatusId: "",
        desiredMonthlyPaymentDay: "",
        details: [newDetailRow()],
    };
}

export function contractToForm(contract: IStudentContract): IContractForm {
    return {
        contractNumber: contract.contractNumber,
        contractDate: toDateInputValue(contract.contractDate),
        studentHumanId: contract.studentHumanId,
        studentName: contract.studentName,
        payerHumanId: contract.payerHumanId,
        payerName: contract.payerName,
        academicYearId: contract.academicYearId.toString(),
        studentStatusId: contract.studentStatusId?.toString() ?? "",
        desiredMonthlyPaymentDay:
            contract.desiredMonthlyPaymentDay?.toString() ?? "",
        details: contract.details.map((d) => ({
            key: nextRowKey++,
            id: d.id,
            courseId: d.courseId.toString(),
            groupSizeId: d.groupSizeId.toString(),
            fourWeekHours: d.fourWeekHours.toString(),
            fourWeekFee: d.fourWeekFee.toString(),
            oneHourFee: d.oneHourFee.toString(),
        })),
    };
}

function toNumber(value: string): number {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: string): number | null {
    return value.trim() === "" ? null : toNumber(value);
}

export function formToRequest(form: IContractForm): IStudentContractRequest {
    return {
        contractNumber: form.contractNumber.trim(),
        contractDate: form.contractDate,
        studentHumanId: form.studentHumanId,
        payerHumanId: form.payerHumanId,
        academicYearId: toNumber(form.academicYearId),
        studentStatusId: toOptionalNumber(form.studentStatusId),
        desiredMonthlyPaymentDay: toOptionalNumber(
            form.desiredMonthlyPaymentDay
        ),
        details: form.details.map((d) => ({
            id: d.id,
            courseId: toNumber(d.courseId),
            groupSizeId: toNumber(d.groupSizeId),
            fourWeekHours: toNumber(d.fourWeekHours),
            fourWeekFee: toNumber(d.fourWeekFee),
            oneHourFee: toNumber(d.oneHourFee),
        })),
    };
}

//Access-ის AfterUpdate: ველიდან გასვლისას (onBlur) დანარჩენი ტარიფი ხელახლა ითვლება.
//ჯგუფის მოსწავლის ტარიფიც (GroupsByStudents) ამ ფუნქციით ითვლება
export function recalculateAfterFeeFieldChange<
    T extends Pick<IDetailFormRow, FeeField>,
>(row: T, changedField: FeeField): T {
    const fields = {
        fourWeekHours: toNumber(row.fourWeekHours),
        fourWeekFee: toNumber(row.fourWeekFee),
        oneHourFee: toNumber(row.oneHourFee),
    };
    const result =
        changedField === "fourWeekFee"
            ? afterFourWeekFeeChange(fields)
            : afterHoursOrOneHourFeeChange(fields);
    if (result === fields) return row;
    return {
        ...row,
        fourWeekFee: result.fourWeekFee.toString(),
        oneHourFee: result.oneHourFee.toString(),
    };
}
