//contractForm.test.ts

import { describe, expect, it } from "vitest";
import {
    contractToForm,
    formToRequest,
    newContractForm,
    newDetailRow,
    recalculateAfterFeeFieldChange,
} from "./contractForm";
import type { IStudentContract } from "../redux/types/studentContractsTypes";

const contract: IStudentContract = {
    scId: 42,
    contractNumber: "6.001",
    contractDate: "2026-09-15T00:00:00",
    studentHumanId: 1,
    studentName: "Alpha Ann",
    payerHumanId: 2,
    payerName: "Beta Bob",
    academicYearId: 11,
    studentStatusId: null,
    desiredMonthlyPaymentDay: 10,
    nextPayDate: null,
    dirtyNextPayDate: true,
    details: [
        {
            id: 100,
            courseId: 5,
            groupSizeId: 2,
            fourWeekHours: 12,
            fourWeekFee: 72,
            oneHourFee: 6,
        },
    ],
};

describe("newContractForm", () => {
    it("starts with today, the current year and one Access-default detail", () => {
        const form = newContractForm("2026-09-29", 11);

        expect(form.contractDate).toBe("2026-09-29");
        expect(form.academicYearId).toBe("11");
        expect(form.studentHumanId).toBe(0);
        expect(form.details).toHaveLength(1);
        expect(form.details[0]).toMatchObject({
            id: 0,
            courseId: "",
            fourWeekHours: "8",
            fourWeekFee: "48",
            oneHourFee: "6",
        });
    });

    it("starts every other field empty", () => {
        expect(newContractForm("2026-09-29", 11)).toEqual({
            contractNumber: "",
            contractDate: "2026-09-29",
            studentHumanId: 0,
            studentName: "",
            payerHumanId: 0,
            payerName: "",
            academicYearId: "11",
            studentStatusId: "",
            desiredMonthlyPaymentDay: "",
            details: [
                {
                    key: expect.any(Number),
                    id: 0,
                    courseId: "",
                    groupSizeId: "",
                    fourWeekHours: "8",
                    fourWeekFee: "48",
                    oneHourFee: "6",
                },
            ],
        });
    });

    it("leaves the year empty when there is no current year", () => {
        expect(newContractForm("2026-09-29", null).academicYearId).toBe("");
    });

    it("gives every new detail row its own key", () => {
        expect(newDetailRow().key).not.toBe(newDetailRow().key);
    });
});

describe("contractToForm / formToRequest", () => {
    it("round-trips a loaded contract", () => {
        const form = contractToForm(contract);

        expect(form.contractDate).toBe("2026-09-15");
        expect(form.studentStatusId).toBe("");
        expect(form.payerName).toBe("Beta Bob");

        expect(formToRequest(form)).toEqual({
            contractNumber: "6.001",
            contractDate: "2026-09-15",
            studentHumanId: 1,
            payerHumanId: 2,
            academicYearId: 11,
            studentStatusId: null,
            desiredMonthlyPaymentDay: 10,
            details: [
                {
                    id: 100,
                    courseId: 5,
                    groupSizeId: 2,
                    fourWeekHours: 12,
                    fourWeekFee: 72,
                    oneHourFee: 6,
                },
            ],
        });
    });

    it("shows a missing payment day as an empty field", () => {
        expect(
            contractToForm({ ...contract, desiredMonthlyPaymentDay: null })
                .desiredMonthlyPaymentDay
        ).toBe("");
    });

    it("trims the number, empties optional fields to null and reads decimal commas", () => {
        const form = {
            ...contractToForm(contract),
            contractNumber: " 6.002 ",
            desiredMonthlyPaymentDay: " ",
            studentStatusId: "3",
        };
        form.details[0].oneHourFee = "7,5";
        form.details[0].fourWeekFee = "abc";

        const request = formToRequest(form);

        expect(request.contractNumber).toBe("6.002");
        expect(request.desiredMonthlyPaymentDay).toBeNull();
        expect(request.studentStatusId).toBe(3);
        expect(request.details[0].oneHourFee).toBe(7.5);
        expect(request.details[0].fourWeekFee).toBe(0);
    });
});

describe("recalculateAfterFeeFieldChange", () => {
    const row = {
        ...newDetailRow(),
        fourWeekHours: "10",
        fourWeekFee: "60",
        oneHourFee: "6",
    };

    it("four week fee change recalculates the one hour fee", () => {
        expect(
            recalculateAfterFeeFieldChange({ ...row, fourWeekFee: "75" }, "fourWeekFee")
        ).toMatchObject({ fourWeekFee: "75", oneHourFee: "7.5" });
    });

    it("hours change recalculates the four week fee", () => {
        expect(
            recalculateAfterFeeFieldChange({ ...row, fourWeekHours: "12" }, "fourWeekHours")
        ).toMatchObject({ fourWeekHours: "12", fourWeekFee: "72" });
    });

    it("one hour fee change recalculates the four week fee", () => {
        expect(
            recalculateAfterFeeFieldChange({ ...row, oneHourFee: "7" }, "oneHourFee")
        ).toMatchObject({ fourWeekFee: "70", oneHourFee: "7" });
    });

    it("keeps the row when the four week fee cannot be divided", () => {
        const zeroHours = { ...row, fourWeekHours: "0" };
        expect(recalculateAfterFeeFieldChange(zeroHours, "fourWeekFee")).toBe(
            zeroHours
        );
    });
});
