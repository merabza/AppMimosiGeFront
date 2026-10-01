//PaymentEdit.test.tsx

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import LocationProbe from "../testUtils/LocationProbe";
import {
    createPaymentsStore,
    paymentData,
    paymentLookups,
    renderPaymentsOnRoute,
    requestedYear,
    yearContracts,
} from "../testUtils/paymentsTestStore";
import type { IPayment } from "../redux/types/paymentsTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import PaymentEdit from "./PaymentEdit";

const listUrl = "/payments?academicYearId=&studentContractId=&bankAccountId=4&dateFrom=&dateTo=";

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

function serve(payment: IPayment = paymentData(), change: ChangeReply = () => ({ status: 200, body: 77 })) {
    return mockFetch((call) => {
        if (call.method !== "GET") return change(call);
        if (call.url.includes("/formlookups")) return { status: 200, body: paymentLookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: yearContracts[requestedYear(call.url)] ?? [] };
        return { status: 200, body: { ...payment, id: Number(call.url.split("/").pop()) } };
    });
}

// the editor opened from the list (so "back" returns to the filtered list), or directly
function renderEditor(url: string, menu: MenuState = "withRight", appClaims?: string[], fromList = true) {
    const store = createPaymentsStore(menu, appClaims);
    renderPaymentsOnRoute(
        <PaymentEdit />,
        store,
        url.startsWith("/paymentEdit/") ? "/paymentEdit/:paymentId" : "/paymentEdit",
        ...(fromList ? [listUrl, url] : [url])
    );
    return store;
}

const changes = (calls: FetchCall[]) => calls.filter((c) => c.method !== "GET");
const location = () => screen.getByTestId("location").textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const studentInput = () => field("მოსწავლე (კონტრაქტი)");

async function chooseStudent(name: string) {
    fireEvent.focus(studentInput());
    fireEvent.mouseDown(await screen.findByText(name));
}

describe("PaymentEdit", () => {
    describe("a new payment", () => {
        it("starts today in the current year with the amount and the bank to fill", async () => {
            serve();
            renderEditor("/paymentEdit");

            expect(await screen.findByText("ახალი გადახდა")).toBeInTheDocument();
            expect(field("გადახდის თარიღი")).toHaveValue(todayDateInputValue());
            expect(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი")).toHaveValue("11");
            expect(studentInput()).toHaveValue("");
            expect(field("თანხა")).toHaveValue(null);
            expect(field("დოკუმენტი")).toHaveValue("");
            expect(field("ბანკი / გადახდის სახე")).toHaveValue("");
            expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
        });

        it("creates the payment and returns to the filtered list", async () => {
            const calls = serve();
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");

            await chooseStudent("Beta Bob 6.002");
            fireEvent.change(field("გადახდის თარიღი"), { target: { value: "2026-09-20" } });
            fireEvent.change(field("თანხა"), { target: { value: "-20.5" } });
            fireEvent.change(field("დოკუმენტი"), { target: { value: " transfer " } });
            fireEvent.change(field("ბანკი / გადახდის სახე"), { target: { value: "9" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls)).toHaveLength(1);
            expect(changes(calls)[0].method).toBe("POST");
            expect(changes(calls)[0].body).toEqual({
                studentContractId: 11,
                payDate: "2026-09-20",
                amount: -20.5,
                document: "transfer",
                bankAccountId: 9,
                checked: false,
            });
        });

        // opened directly there is no list to go back to
        it("goes to the list after creating when opened directly", async () => {
            serve();
            renderEditor("/paymentEdit", "withRight", undefined, false);
            await screen.findByText("ახალი გადახდა");

            await chooseStudent("Alpha Ann 6.001");
            fireEvent.change(field("თანხა"), { target: { value: "50" } });
            fireEvent.change(field("ბანკი / გადახდის სახე"), { target: { value: "4" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            await waitFor(() => expect(location()).toBe("/payments"));
        });

        it("is not sent without a student", async () => {
            const calls = serve();
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");

            fireEvent.change(field("თანხა"), { target: { value: "50" } });
            fireEvent.change(field("ბანკი / გადახდის სახე"), { target: { value: "4" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/paymentEdit");
        });

        // zero is refused by the server; the browser is told so before sending
        it("is not sent with a zero amount", async () => {
            const calls = serve();
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");

            await chooseStudent("Alpha Ann 6.001");
            fireEvent.change(field("თანხა"), { target: { value: "0" } });
            fireEvent.change(field("ბანკი / გადახდის სახე"), { target: { value: "4" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(field("თანხა").validationMessage).toBe("თანხა 0 ვერ იქნება");
            expect(changes(calls)).toHaveLength(0);
        });

        it("is not sent without a bank", async () => {
            const calls = serve();
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");

            await chooseStudent("Alpha Ann 6.001");
            fireEvent.change(field("თანხა"), { target: { value: "50" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(changes(calls)).toHaveLength(0);
        });

        it("clears the student when the year changes", async () => {
            serve();
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");
            await chooseStudent("Alpha Ann 6.001");

            fireEvent.change(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი"), {
                target: { value: "10" },
            });

            expect(studentInput()).toHaveValue("");
            await chooseStudent("Gamma Gia 6.001");
            expect(studentInput()).toHaveValue("Gamma Gia 6.001");
        });

        it("shows the server's refusal and stays", async () => {
            serve(paymentData(), () => ({
                status: 400,
                body: { title: "StudentContractNotFound", detail: "contract not found", status: 400 },
            }));
            renderEditor("/paymentEdit");
            await screen.findByText("ახალი გადახდა");

            await chooseStudent("Alpha Ann 6.001");
            fireEvent.change(field("თანხა"), { target: { value: "50" } });
            fireEvent.change(field("ბანკი / გადახდის სახე"), { target: { value: "4" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(await screen.findByText("contract not found")).toBeInTheDocument();
            expect(location()).toBe("/paymentEdit");
        });
    });

    describe("an existing payment", () => {
        it("shows the payment's fields", async () => {
            serve();
            renderEditor("/paymentEdit/5");

            await waitFor(() => expect(field("თანხა")).toHaveValue(300));
            expect(screen.getByText("გადახდა")).toBeInTheDocument();
            expect(studentInput()).toHaveValue("Alpha Ann 6.001");
            expect(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი")).toHaveValue("11");
            expect(field("გადახდის თარიღი")).toHaveValue("2026-09-15");
            expect(field("დოკუმენტი")).toHaveValue("N 15");
            expect(field("ბანკი / გადახდის სახე")).toHaveValue("1");
        });

        it("saves the changes and returns to the filtered list", async () => {
            const calls = serve();
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            fireEvent.change(field("თანხა"), { target: { value: "310.5" } });
            fireEvent.change(field("დოკუმენტი"), { target: { value: "" } });
            fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.split("/payments")[1]])).toEqual([["PUT", "/5"]]);
            expect(changes(calls)[0].body).toEqual({
                studentContractId: 10,
                payDate: "2026-09-15",
                amount: 310.5,
                document: null,
                bankAccountId: 1,
                checked: false,
            });
        });

        it("closes without saving", async () => {
            const calls = serve();
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls)).toHaveLength(0);
        });

        it("deletes the payment after the confirmation", async () => {
            const calls = serve(paymentData(), () => ({ status: 200 }));
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            expect(await screen.findByText(/15\.09\.2026-ის გადახდა \(თანხა 300\)/)).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.split("/payments")[1]])).toEqual([["DELETE", "/5"]]);
        });

        it("keeps the payment when the deletion is not confirmed", async () => {
            const calls = serve();
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));

            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());
            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/paymentEdit/5");
        });

        it("shows a refused deletion and stays", async () => {
            serve(paymentData(), () => ({
                status: 409,
                body: { title: "PaymentIsChecked", detail: "payment is checked", status: 409 },
            }));
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

            expect(await screen.findByText("payment is checked")).toBeInTheDocument();
            expect(location()).toBe("/paymentEdit/5");
        });

        // the form is filled once per payment, but another payment opened in the same editor is loaded
        it("loads another payment opened in the same editor", async () => {
            //payment 6 is answered by hand, so the loading in between can be seen
            let answerSix: (reply: FetchReply) => void = () => {};
            const six = new Promise<FetchReply>((resolve) => (answerSix = resolve));
            mockFetch((call) => {
                if (call.url.includes("/formlookups")) return { status: 200, body: paymentLookups };
                if (call.url.includes("/studentcontracts"))
                    return { status: 200, body: yearContracts[requestedYear(call.url)] ?? [] };
                if (call.url.endsWith("/6")) return six;
                return { status: 200, body: paymentData() };
            });
            render(
                <Provider store={createPaymentsStore()}>
                    <MemoryRouter initialEntries={["/paymentEdit/5"]}>
                        <Routes>
                            <Route path="/paymentEdit/:paymentId" element={<PaymentEdit />} />
                        </Routes>
                        <Link to="/paymentEdit/6">next</Link>
                        <LocationProbe />
                    </MemoryRouter>
                </Provider>
            );
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));
            fireEvent.change(field("თანხა"), { target: { value: "1" } });

            fireEvent.click(screen.getByText("next"));

            expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
            answerSix({ status: 200, body: paymentData({ id: 6, amount: 40 }) });
            await waitFor(() => expect(field("თანხა")).toHaveValue(40));
        });
    });

    describe("the checked flag", () => {
        it("is neither shown nor sent as checked without the special right", async () => {
            const calls = serve();
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            expect(screen.queryByLabelText("შემოწმებულია")).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));
            await waitFor(() => expect(changes(calls)).toHaveLength(1));
            expect((changes(calls)[0].body as { checked: boolean }).checked).toBe(false);
        });

        // a checked payment is only seen by the roles without the special right (D77)
        it("makes a checked payment read-only without the special right", async () => {
            serve(paymentData({ checked: true }));
            renderEditor("/paymentEdit/5");
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            expect(screen.getByText(/გადახდა შემოწმებულია/)).toBeInTheDocument();
            for (const label of ["თანხა", "გადახდის თარიღი", "დოკუმენტი", "ბანკი / გადახდის სახე"])
                expect(field(label)).toBeDisabled();
            expect(studentInput()).toBeDisabled();
            expect(screen.queryByRole("button", { name: /შენახვა/ })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));
            await waitFor(() => expect(location()).toBe(listUrl));
        });

        it("is shown and can be set with the special right", async () => {
            const calls = serve();
            renderEditor("/paymentEdit/5", "withRight", ["CheckPayments"]);
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            expect(field("შემოწმებულია")).not.toBeChecked();
            fireEvent.click(field("შემოწმებულია"));
            fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

            await waitFor(() => expect(changes(calls)).toHaveLength(1));
            expect((changes(calls)[0].body as { checked: boolean }).checked).toBe(true);
        });

        it("leaves a checked payment editable with the special right", async () => {
            const calls = serve(paymentData({ checked: true }), () => ({ status: 200 }));
            renderEditor("/paymentEdit/5", "withRight", ["CheckPayments"]);
            await waitFor(() => expect(field("თანხა")).toHaveValue(300));

            expect(screen.queryByText(/გადახდა შემოწმებულია/)).not.toBeInTheDocument();
            expect(field("შემოწმებულია")).toBeChecked();
            fireEvent.click(field("შემოწმებულია"));
            fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

            await waitFor(() => expect(changes(calls)).toHaveLength(1));
            expect((changes(calls)[0].body as { checked: boolean }).checked).toBe(false);
        });

        it("starts unchecked for a new payment with the special right", async () => {
            serve();
            renderEditor("/paymentEdit", "withRight", ["CheckPayments"]);

            expect(await screen.findByLabelText("შემოწმებულია")).not.toBeChecked();
        });
    });

    it("tells a role without the right and loads nothing", async () => {
        serve();
        const store = renderEditor("/paymentEdit/5", "withoutRight");

        expect(await screen.findByText("გადახდების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().paymentsApi.queries).toEqual({});
    });

    it("waits while the menu is loading", () => {
        serve();
        renderEditor("/paymentEdit/5", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });

    it("tells when the payment fails to load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? { status: 200, body: paymentLookups }
                : { status: 404, body: { title: "PaymentNotFound", detail: "payment not found", status: 404 } }
        );
        renderEditor("/paymentEdit/5");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getAllByText("payment not found").length).toBeGreaterThan(0);
    });
});
