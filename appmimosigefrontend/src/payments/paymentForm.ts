//paymentForm.ts

import type {
    IPayment,
    IPaymentRequest,
} from "../redux/types/paymentsTypes";
import { toDateInputValue } from "../studentContracts/dateFormat";

//ფორმის მდგომარეობა. რიცხვითი და ჩამოსაშლელი ველები სტრიქონებადაა, რომ ცარიელი მნიშვნელობა არ დაიკარგოს.
//academicYearId კონტრაქტის ასარჩევი სიის წელია და მოთხოვნაში არ იგზავნება
export interface IPaymentForm {
    academicYearId: string;
    studentContractId: string;
    payDate: string;
    amount: string;
    document: string;
    bankAccountId: string;
    checked: boolean;
}

//ახალი გადახდა: თარიღი დღეს (Access-ის Date()); თანხა და გადახდის სახე შესავსებია
export function newPaymentForm(
    today: string,
    academicYearId: string
): IPaymentForm {
    return {
        academicYearId,
        studentContractId: "",
        payDate: today,
        amount: "",
        document: "",
        bankAccountId: "",
        checked: false,
    };
}

export function paymentToForm(payment: IPayment): IPaymentForm {
    return {
        academicYearId: payment.academicYearId.toString(),
        studentContractId: payment.studentContractId.toString(),
        payDate: toDateInputValue(payment.payDate),
        amount: payment.amount.toString(),
        document: payment.document ?? "",
        bankAccountId: payment.bankAccountId?.toString() ?? "",
        checked: payment.checked,
    };
}

//თანხა ათწილადი მძიმითაც შეიძლება ჩაიწეროს
export function parseAmount(value: string): number {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

export function paymentFormToRequest(form: IPaymentForm): IPaymentRequest {
    const document = form.document.trim();
    return {
        studentContractId: Number(form.studentContractId),
        payDate: form.payDate,
        amount: parseAmount(form.amount),
        document: document === "" ? null : document,
        bankAccountId: form.bankAccountId === "" ? null : Number(form.bankAccountId),
        checked: form.checked,
    };
}

//სერვერის წესი: თანხა 0 ვერ იქნება (უარყოფითი დასაშვებია). ბრაუზერი ამას თავისით ვერ ამოწმებს
export function amountValidationMessage(value: string): string {
    return value.trim() !== "" && parseAmount(value) === 0
        ? "თანხა 0 ვერ იქნება"
        : "";
}
