//paymentForm.test.ts

import { describe, expect, it } from "vitest";
import { paymentData } from "../testUtils/paymentsTestStore";
import {
    amountValidationMessage,
    newPaymentForm,
    parseAmount,
    paymentFormToRequest,
    paymentToForm,
} from "./paymentForm";

describe("newPaymentForm", () => {
    // Access: the date defaults to today; the amount and the payment type are to be filled
    it("is dated today in the given year with nothing else filled", () => {
        expect(newPaymentForm("2026-10-01", "11")).toEqual({
            academicYearId: "11",
            studentContractId: "",
            payDate: "2026-10-01",
            amount: "",
            document: "",
            bankAccountId: "",
            checked: false,
        });
    });
});

describe("paymentToForm", () => {
    it("takes the payment's fields and its contract's year", () => {
        expect(paymentToForm(paymentData({ checked: true }))).toEqual({
            academicYearId: "11",
            studentContractId: "10",
            payDate: "2026-09-15",
            amount: "300",
            document: "N 15",
            bankAccountId: "1",
            checked: true,
        });
    });

    it("shows a missing document and payment type as empty", () => {
        const form = paymentToForm(paymentData({ document: null, bankAccountId: null }));

        expect(form.document).toBe("");
        expect(form.bankAccountId).toBe("");
    });
});

describe("paymentFormToRequest", () => {
    it("sends the fields as numbers, without the year", () => {
        expect(
            paymentFormToRequest({
                academicYearId: "11",
                studentContractId: "13",
                payDate: "2026-09-20",
                amount: "-120,5",
                document: "  transfer  ",
                bankAccountId: "9",
                checked: true,
            })
        ).toEqual({
            studentContractId: 13,
            payDate: "2026-09-20",
            amount: -120.5,
            document: "transfer",
            bankAccountId: 9,
            checked: true,
        });
    });

    it("sends an empty document and payment type as null", () => {
        const request = paymentFormToRequest({
            ...newPaymentForm("2026-10-01", "11"),
            studentContractId: "10",
            amount: "5",
            document: "   ",
        });

        expect(request.document).toBeNull();
        expect(request.bankAccountId).toBeNull();
        expect(request.checked).toBe(false);
    });
});

describe("parseAmount", () => {
    it.each([
        ["300", 300],
        ["12.34", 12.34],
        ["12,34", 12.34],
        ["-0.5", -0.5],
        ["", 0],
        ["abc", 0],
    ])("reads %s as %s", (value, expected) => {
        expect(parseAmount(value)).toBe(expected);
    });
});

describe("amountValidationMessage", () => {
    // the browser checks the empty value (required) and the step; zero is the server's rule
    it.each([
        ["0", "თანხა 0 ვერ იქნება"],
        ["0.00", "თანხა 0 ვერ იქნება"],
        ["-0", "თანხა 0 ვერ იქნება"],
        ["", ""],
        ["  ", ""],
        ["0.01", ""],
        ["-20", ""],
    ])("for %s is %s", (value, expected) => {
        expect(amountValidationMessage(value)).toBe(expected);
    });
});
