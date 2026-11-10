//BankTransactionEdit.test.tsx

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    academicYears,
    bankTransactionData,
    createBankTransactionsStore,
    renderBankTransactionsOnRoute,
    requestedYear,
    yearContracts,
} from "../testUtils/bankTransactionsTestStore";
import type { IBankTransaction } from "../redux/types/bankTransactionsTypes";
import BankTransactionEdit from "./BankTransactionEdit";

const base = `${testBaseUrl}/banktransactions`;

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

function serve(transaction: IBankTransaction = bankTransactionData(), change: ChangeReply = () => ({ status: 200 })) {
    return mockFetch((call) => {
        if (call.method !== "GET") return change(call);
        if (call.url.endsWith("/academicyears")) return { status: 200, body: academicYears };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: yearContracts[requestedYear(call.url)] ?? [] };
        return { status: 200, body: transaction };
    });
}

function renderEditor(menu: MenuState = "withRight", url = "/bankTransactionEdit/7") {
    const store = createBankTransactionsStore(menu);
    renderBankTransactionsOnRoute(<BankTransactionEdit />, store, "/bankTransactionEdit/:bankTransactionId", url);
    return store;
}

const changes = (calls: FetchCall[]) => calls.filter((c) => c.method !== "GET");
const amountField = (index: number) => screen.getByLabelText("თანხა", { selector: `#shareAmount${index}` });
const contractField = (index: number) => screen.getByLabelText(`მოსწავლე ${index + 1}`) as HTMLInputElement;

async function chooseContract(index: number, name: string) {
    fireEvent.focus(contractField(index));
    fireEvent.mouseDown(await screen.findByText(name));
}

describe("BankTransactionEdit", () => {
    it("shows the transaction and its allocation", async () => {
        const calls = serve();
        renderEditor();

        expect(await screen.findByText("ბანკის ჩარიცხვის განაწილება")).toBeInTheDocument();
        expect(screen.getByTestId("transactionAmount")).toHaveTextContent("100.00 GEL");
        expect(screen.getByText("Delta Dan")).toBeInTheDocument();
        expect(screen.getByText("TBC Bank")).toBeInTheDocument();
        expect(screen.getByText("01001000100")).toBeInTheDocument();
        expect(screen.getByText("GE00TB0000000000000100")).toBeInTheDocument();
        expect(screen.getByText("tuition")).toBeInTheDocument();
        expect(screen.getByText("მოსწავლის სახელი")).toBeInTheDocument();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));
        expect(amountField(0)).toHaveValue(60);
        expect(screen.getByTestId("sharesTotal")).toHaveTextContent("განაწილებული: 60.00 · ნაშთი: 40.00");
        expect(screen.getByLabelText("არ არის მოსწავლის გადახდა")).toBeDisabled();
        expect(calls.find((c) => c.url === `${base}/7`)).toBeDefined();
    });

    it("tells a manual change", async () => {
        serve(bankTransactionData({ allocatedManually: true }));
        renderEditor();

        expect(await screen.findByText(/შეცვლილია ხელით/)).toBeInTheDocument();
    });

    // a new share starts in the current year with the remainder; the shares are saved together
    it("adds a share with the remainder and saves the allocation", async () => {
        const calls = serve();
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.click(screen.getByRole("button", { name: "მოსწავლის დამატება" }));
        expect(screen.getByLabelText("მოსწავლე 2: სასწავლო წელი")).toHaveValue("11");
        expect(amountField(1)).toHaveValue(40);
        await chooseContract(1, "Beta Bob 6.002");
        fireEvent.change(amountField(0), { target: { value: "59.5" } });
        fireEvent.change(amountField(1), { target: { value: "40.5" } });
        expect(screen.getByTestId("sharesTotal")).toHaveTextContent("განაწილებული: 100.00 · ნაშთი: 0.00");
        fireEvent.click(screen.getByRole("button", { name: "შენახვა" }));

        expect(await screen.findByTestId("savedMessage")).toHaveTextContent("განაწილება შენახულია");
        expect(changes(calls).map((c) => [c.method, c.url, c.body])).toEqual([
            [
                "PUT",
                `${base}/7/allocation`,
                {
                    shares: [
                        { studentContractId: 10, amount: 59.5 },
                        { studentContractId: 11, amount: 40.5 },
                    ],
                },
            ],
        ]);
        // the saved transaction is loaded again
        await waitFor(() => expect(calls.filter((c) => c.url === `${base}/7`)).toHaveLength(2));
    });

    it("adds an empty amount when nothing is left", async () => {
        serve(bankTransactionData({ amount: 60 }));
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.click(screen.getByRole("button", { name: "მოსწავლის დამატება" }));

        expect(amountField(1)).toHaveValue(null);
    });

    it("chooses a contract of another year", async () => {
        serve();
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.change(screen.getByLabelText("მოსწავლე 1: სასწავლო წელი"), { target: { value: "10" } });
        expect(contractField(0)).toHaveValue("");
        await chooseContract(0, "Gamma Gia 6.001");

        expect(contractField(0)).toHaveValue("Gamma Gia 6.001");
    });

    it("does not save shares above the amount", async () => {
        const calls = serve();
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.change(amountField(0), { target: { value: "100.01" } });

        expect(screen.getByTestId("sharesError")).toHaveTextContent(
            "განაწილებული ჯამი ჩარიცხულ თანხაზე მეტი ვერ იქნება"
        );
        expect(screen.getByRole("button", { name: "შენახვა" })).toBeDisabled();
        fireEvent.submit(screen.getByRole("button", { name: "შენახვა" }).closest("form")!);
        expect(changes(calls)).toHaveLength(0);
    });

    // removing every share removes the allocation
    it("removes a share and saves an empty allocation", async () => {
        const calls = serve();
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.click(screen.getByTitle("წილის წაშლა"));
        expect(screen.getByTestId("sharesTotal")).toHaveTextContent("განაწილებული: 0.00 · ნაშთი: 100.00");
        fireEvent.click(screen.getByRole("button", { name: "შენახვა" }));

        await waitFor(() => expect(changes(calls).map((c) => c.body)).toEqual([{ shares: [] }]));
    });

    it("shows a refused save", async () => {
        serve(bankTransactionData(), () => ({
            status: 409,
            body: { title: "AllocationExceedsAmount", detail: "too much", status: 409 },
        }));
        renderEditor();
        await waitFor(() => expect(contractField(0)).toHaveValue("Alpha Ann 6.001"));

        fireEvent.click(screen.getByRole("button", { name: "შენახვა" }));

        expect(await screen.findByText(/too much|AllocationExceedsAmount/)).toBeInTheDocument();
        expect(screen.queryByTestId("savedMessage")).not.toBeInTheDocument();
    });

    it("keeps a checked allocation read only", async () => {
        serve(
            bankTransactionData({
                allocations: [{ ...bankTransactionData().allocations[0], checked: true }],
            })
        );
        renderEditor();

        expect(await screen.findByText(/განაწილება აღარ იცვლება/)).toBeInTheDocument();
        expect(amountField(0)).toBeDisabled();
        expect(screen.queryByRole("button", { name: "შენახვა" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "მოსწავლის დამატება" })).not.toBeInTheDocument();
    });

    it("marks an unallocated transaction as not a student's payment", async () => {
        const calls = serve(bankTransactionData({ allocations: [] }));
        renderEditor();

        const ignored = await screen.findByLabelText("არ არის მოსწავლის გადახდა");
        expect(ignored).toBeEnabled();
        fireEvent.click(ignored);

        await waitFor(() =>
            expect(changes(calls).map((c) => [c.method, c.url, c.body])).toEqual([
                ["PUT", `${base}/7/ignored`, { ignored: true }],
            ])
        );
    });

    it("hides the allocation of an ignored transaction and can clear the mark", async () => {
        const calls = serve(bankTransactionData({ allocations: [], ignored: true }));
        renderEditor();

        const ignored = await screen.findByLabelText("არ არის მოსწავლის გადახდა");
        expect(ignored).toBeChecked();
        expect(screen.queryByTestId("sharesTotal")).not.toBeInTheDocument();
        fireEvent.click(ignored);

        await waitFor(() => expect(changes(calls).map((c) => c.body)).toEqual([{ ignored: false }]));
    });

    it("goes back to the list", async () => {
        serve();
        renderEditor();

        fireEvent.click(await screen.findByText("ჩარიცხვების სია"));

        expect(screen.getByTestId("location")).toHaveTextContent("/bankTransactions");
    });

    it("shows a failed load", async () => {
        mockFetch(() => ({ status: 404, body: { title: "BankTransactionNotFound", detail: "none", status: 404 } }));
        renderEditor();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    it.each<[MenuState, string]>([
        ["withoutRight", "ბანკის ჩარიცხვების ნახვის უფლება არ გაქვთ"],
        ["loading", "მიმდინარეობს ჩატვირთვა"],
    ])("with the menu %s asks nothing", async (menu, text) => {
        const calls = serve();
        renderEditor(menu);

        expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("asks nothing for an id that is not a number", async () => {
        const calls = serve();
        renderEditor("withRight", "/bankTransactionEdit/x");

        await waitFor(() => expect(calls.some((c) => c.url.endsWith("/academicyears"))).toBe(true));
        expect(calls.filter((c) => c.url.startsWith(`${base}/`))).toHaveLength(0);
        expect(screen.getByText(/მიმდინარეობს ჩატვირთვა/)).toBeInTheDocument();
    });
});
