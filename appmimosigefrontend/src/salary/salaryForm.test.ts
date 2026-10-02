//salaryForm.test.ts

import { describe, expect, it } from "vitest";
import { salaryHeaderData, salaryLine, salaryLookups, salaryPart } from "../testUtils/salaryTestStore";
import {
    declarationFileName,
    emptySalaryPartForm,
    formatMoney,
    formatMonth,
    isDeductionType,
    isPartAmountInvalid,
    isPartCalculated,
    lessonSalaryPartTypeId,
    manualPartTypes,
    monthToRequest,
    newSalaryHeaderForm,
    previousMonthInputValue,
    salaryHeaderFormToRequest,
    salaryHeaderToForm,
    salaryLineTotals,
    salaryPartDeleteQuestion,
    salaryPartFormToRequest,
    salaryPartToForm,
    transferFileName,
} from "./salaryForm";

const types = manualPartTypes(salaryLookups.partTypes);

describe("salaryForm", () => {
    it("a new header is charged and transferred on the fifth of the current month", () => {
        expect(newSalaryHeaderForm(new Date(2026, 0, 28, 13))).toEqual({
            shChargeDate: "2026-01-05",
            shTransferDate: "2026-01-05",
        });
        expect(newSalaryHeaderForm(new Date(2026, 10, 1))).toEqual({
            shChargeDate: "2026-11-05",
            shTransferDate: "2026-11-05",
        });
    });

    it("the header form keeps the dates only", () => {
        const form = salaryHeaderToForm(salaryHeaderData());

        expect(form).toEqual({ shChargeDate: "2026-10-05", shTransferDate: "2026-10-04" });
        expect(salaryHeaderFormToRequest(form)).toEqual({
            shChargeDate: "2026-10-05",
            shTransferDate: "2026-10-04",
        });
    });

    it("a part goes to the form as text and back as numbers", () => {
        const form = salaryPartToForm(salaryPart({ spAmount: 12.5 }));

        expect(form).toEqual({ teacherContractId: "5", salaryPartTypeId: "3", spAmount: "12.5" });
        expect(salaryPartFormToRequest(form)).toEqual({ teacherContractId: 5, salaryPartTypeId: 3, spAmount: 12.5 });
        expect(salaryPartToForm(salaryPart({ salaryPartTypeId: null })).salaryPartTypeId).toBe("");
        expect(emptySalaryPartForm).toEqual({ teacherContractId: "", salaryPartTypeId: "", spAmount: "" });
    });

    it("type 1 is not entered by hand", () => {
        expect(lessonSalaryPartTypeId).toBe(1);
        expect(types.map((t) => t.id)).toEqual([3, 4, 6]);
        expect(isPartCalculated(salaryPart({ salaryPartTypeId: 1 }))).toBe(true);
        expect(isPartCalculated(salaryPart({ salaryPartTypeId: 3 }))).toBe(false);
        expect(isPartCalculated(salaryPart({ salaryPartTypeId: null }))).toBe(false);
    });

    it("the delete question names the employee, the type and the amount", () => {
        expect(salaryPartDeleteQuestion(salaryPart({ spAmount: 12.5 }))).toBe(
            "დარწმუნებული ხართ, რომ გსურთ წაშალოთ მდგენელი: Beta Bob / T3.05, დანამატი, 12.50?"
        );
        expect(salaryPartDeleteQuestion(salaryPart({ salaryPartTypeName: null }))).toBe(
            "დარწმუნებული ხართ, რომ გსურთ წაშალოთ მდგენელი: Beta Bob / T3.05, , 800.00?"
        );
    });

    it("a deduction is a type counted at place 2", () => {
        expect(isDeductionType(types, "4")).toBe(true);
        expect(isDeductionType(types, "3")).toBe(false);
        expect(isDeductionType(types, "6")).toBe(false);
        expect(isDeductionType(types, "")).toBe(false);
    });

    it.each([
        ["3", "", true],
        ["3", " ", true],
        ["3", "abc", true],
        ["3", "-5", false],
        ["3", "0", false],
        ["4", "0", true],
        ["4", "-0.01", true],
        ["4", "0.01", false],
        ["", "5", false],
    ])("type %s with amount '%s' is invalid: %s", (typeId, amount, invalid) => {
        expect(isPartAmountInvalid({ teacherContractId: "1", salaryPartTypeId: typeId, spAmount: amount }, types)).toBe(
            invalid
        );
    });

    it("totals every money column and the Access total", () => {
        const totals = salaryLineTotals(salaryHeaderData().lines);

        expect(totals).toEqual({
            saNetAmountRound: 900,
            saAmountGross: 1125,
            saPension2: 2.5,
            saGrossMinusPension: 1122.5,
            saIncomeTax: 224.5,
            saGamokvitva: 10,
            saPension4: 5,
            saAmountNet: 888,
            saIndividualIncomeTax: 0,
            total: 1117.5,
        });
    });

    it("totals without decimal drift", () => {
        const lines = [0.1, 0.2, 0.0001].map((v) => salaryLine({ saAmountNet: v, saIncomeTax: 0, saPension4: 0 }));

        expect(salaryLineTotals(lines).saAmountNet).toBe(0.3001);
        expect(salaryLineTotals([]).total).toBe(0);
    });

    it("the declaration month defaults to the previous month", () => {
        expect(previousMonthInputValue(new Date(2026, 9, 2))).toBe("2026-09");
        expect(previousMonthInputValue(new Date(2027, 0, 31))).toBe("2026-12");
        expect(monthToRequest("2026-09")).toBe("2026-09-01");
    });

    it("file names are the server's", () => {
        expect(transferFileName("2026-10-05T00:00:00")).toBe("salary_2026_10_5.csv");
        expect(transferFileName("2026-01-15")).toBe("salary_2026_1_15.csv");
        expect(declarationFileName("2026-09")).toBe("TaxDepDeclaration_2026_9.csv");
        expect(declarationFileName("2026-12")).toBe("TaxDepDeclaration_2026_12.csv");
    });

    it("formats money and months", () => {
        expect(formatMoney(3771.44)).toBe("3771.44");
        expect(formatMoney(800)).toBe("800.00");
        expect(formatMoney(8.66666)).toBe("8.67");
        expect(formatMonth("2026-09-01T00:00:00")).toBe("09.2026");
    });
});
