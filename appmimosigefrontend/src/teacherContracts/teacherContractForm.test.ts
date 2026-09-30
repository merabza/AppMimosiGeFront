//teacherContractForm.test.ts

import { describe, expect, it } from "vitest";
import type { ITeacherContract } from "../redux/types/teacherContractsTypes";
import {
    newTeacherContractForm,
    teacherContractFormToRequest,
    teacherContractToForm,
    toTimeInputValue,
} from "./teacherContractForm";

const contract: ITeacherContract = {
    id: 7,
    contractNumber: "T3.07",
    contractDate: "2025-09-01T00:00:00",
    teacherHumanId: 1,
    teacherName: "Alpha Ann",
    bankAccount: "GE00TB0000000000000000",
    bankAccountCode: "TBCBGE22",
    pensionScheme: true,
    indEnt: false,
    rsQuoteTypeId: 1,
    rsCountryId: 2,
    fixedAmount: 850.5,
    nextMonth: true,
    description: "ხელფასი",
    salarySchemaByHoursId: 4,
    workHourGroupId: 5,
    workHoursStart: "12:00:00",
    workHoursEnd: "18:30:00",
    contractEndDate: "2027-06-30T00:00:00",
};

describe("newTeacherContractForm", () => {
    it("starts with today, a zero fixed amount and nothing chosen", () => {
        const form = newTeacherContractForm("2026-09-30");

        expect(form).toEqual({
            contractNumber: "",
            contractDate: "2026-09-30",
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
        });
    });
});

describe("toTimeInputValue", () => {
    it("cuts the seconds for the time input", () => {
        expect(toTimeInputValue("08:05:00")).toBe("08:05");
    });

    it("is empty without a time", () => {
        expect(toTimeInputValue(null)).toBe("");
        expect(toTimeInputValue(undefined)).toBe("");
    });
});

describe("teacherContractToForm", () => {
    it("puts the contract into the form fields", () => {
        expect(teacherContractToForm(contract)).toEqual({
            contractNumber: "T3.07",
            contractDate: "2025-09-01",
            teacherHumanId: 1,
            teacherName: "Alpha Ann",
            bankAccount: "GE00TB0000000000000000",
            bankAccountCode: "TBCBGE22",
            pensionScheme: true,
            indEnt: false,
            rsQuoteTypeId: "1",
            rsCountryId: "2",
            fixedAmount: "850.5",
            nextMonth: true,
            description: "ხელფასი",
            salarySchemaByHoursId: "4",
            workHourGroupId: "5",
            workHoursStart: "12:00",
            workHoursEnd: "18:30",
            contractEndDate: "2027-06-30",
        });
    });

    it("shows empty values as empty fields", () => {
        const form = teacherContractToForm({
            ...contract,
            bankAccount: null,
            bankAccountCode: null,
            rsQuoteTypeId: null,
            description: null,
            salarySchemaByHoursId: null,
            workHourGroupId: null,
            workHoursStart: null,
            workHoursEnd: null,
            contractEndDate: null,
        });

        expect(form).toMatchObject({
            bankAccount: "",
            bankAccountCode: "",
            rsQuoteTypeId: "",
            description: "",
            salarySchemaByHoursId: "",
            workHourGroupId: "",
            workHoursStart: "",
            workHoursEnd: "",
            contractEndDate: "",
        });
    });
});

describe("teacherContractFormToRequest", () => {
    it("is the inverse of teacherContractToForm", () => {
        const request = teacherContractFormToRequest(teacherContractToForm(contract));

        expect(request).toEqual({
            contractNumber: "T3.07",
            contractDate: "2025-09-01",
            teacherHumanId: 1,
            bankAccount: "GE00TB0000000000000000",
            bankAccountCode: "TBCBGE22",
            pensionScheme: true,
            indEnt: false,
            rsQuoteTypeId: 1,
            rsCountryId: 2,
            fixedAmount: 850.5,
            nextMonth: true,
            description: "ხელფასი",
            salarySchemaByHoursId: 4,
            workHourGroupId: 5,
            workHoursStart: "12:00:00",
            workHoursEnd: "18:30:00",
            contractEndDate: "2027-06-30",
        });
    });

    it("sends empty and blank fields as null and trims texts", () => {
        const request = teacherContractFormToRequest({
            ...newTeacherContractForm("2026-09-30"),
            contractNumber: " T3.12 ",
            bankAccount: "  ",
            description: " პრემია ",
            fixedAmount: "12,5",
            rsCountryId: "2",
        });

        expect(request).toMatchObject({
            contractNumber: "T3.12",
            bankAccount: null,
            bankAccountCode: null,
            description: "პრემია",
            fixedAmount: 12.5,
            rsQuoteTypeId: null,
            rsCountryId: 2,
            salarySchemaByHoursId: null,
            workHourGroupId: null,
            workHoursStart: null,
            workHoursEnd: null,
            contractEndDate: null,
        });
    });

    it("keeps a time that already has seconds", () => {
        const request = teacherContractFormToRequest({
            ...newTeacherContractForm("2026-09-30"),
            workHoursStart: "09:15:30",
        });

        expect(request.workHoursStart).toBe("09:15:30");
    });

    it("sends an unreadable amount as zero", () => {
        const request = teacherContractFormToRequest({
            ...newTeacherContractForm("2026-09-30"),
            fixedAmount: "abc",
        });

        expect(request.fixedAmount).toBe(0);
    });
});
