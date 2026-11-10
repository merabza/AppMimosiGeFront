//BankTransactions.test.tsx

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl, type FetchCall } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    bankTransactionRow,
    createBankTransactionsStore,
    renderBankTransactionsOnRoute,
} from "../testUtils/bankTransactionsTestStore";
import type { IImportBankTransactions } from "../redux/types/bankTransactionsTypes";
import BankTransactions from "./BankTransactions";

const base = `${testBaseUrl}/banktransactions`;

const imported: IImportBankTransactions = {
    accounts: [
        {
            bankAccountId: 4,
            bankName: "TBC Bank",
            periodFrom: "2026-11-06T00:00:00",
            periodTo: "2026-11-09T00:00:00",
            received: 4,
            alreadyImported: 1,
            imported: 3,
            allocated: 2,
            unallocated: 1,
            error: null,
        },
        {
            bankAccountId: 1,
            bankName: "Bank of Georgia",
            periodFrom: "2026-11-10T00:00:00",
            periodTo: "2026-11-10T00:00:00",
            received: 0,
            alreadyImported: 0,
            imported: 0,
            allocated: 0,
            unallocated: 0,
            error: "rate limited",
        },
    ],
    dryRun: false,
};

const rows = [
    bankTransactionRow(),
    bankTransactionRow({
        id: 8,
        amount: 50.5,
        allocatedAmount: 0,
        matchStep: 0,
        partnerName: "Echo Eve",
        purpose: null,
    }),
];

function serve(reply?: (call: FetchCall) => { status: number; body?: unknown }) {
    return mockFetch(
        (call) => reply?.(call) ?? (call.method === "GET" ? { status: 200, body: rows } : { status: 200, body: imported })
    );
}

function renderList(url = "/bankTransactions", menu: MenuState = "withRight") {
    const store = createBankTransactionsStore(menu);
    renderBankTransactionsOnRoute(<BankTransactions />, store, "/bankTransactions", url);
    return store;
}

const location = () => screen.getByTestId("location").textContent;

describe("BankTransactions", () => {
    it("lists the transactions with their state", async () => {
        const calls = serve();
        renderList();

        const first = await screen.findByTestId("bankTransaction-7");
        expect([...first.querySelectorAll("td")].map((td) => td.textContent)).toEqual([
            "09.11.2026",
            "TBC Bank",
            "100.00",
            "Delta Dan",
            "tuition",
            "გადამხდელის პირადი ნომერი",
            "100.00",
            "განაწილებული",
            "განაწილება",
        ]);
        const second = screen.getByTestId("bankTransaction-8");
        expect(within(second).getByText("ვერ მოიძებნა")).toBeInTheDocument();
        expect(within(second).getByText("გაუნაწილებელი")).toBeInTheDocument();
        expect(calls[0].url).toBe(base);
    });

    it("marks a transaction with a checked payment", async () => {
        serve(() => ({ status: 200, body: [bankTransactionRow({ hasCheckedPayments: true })] }));
        renderList();

        expect(await screen.findByTitle("განაწილების გადახდა შემოწმებულია")).toBeInTheDocument();
    });

    it("opens the allocation of a transaction", async () => {
        serve();
        renderList();

        fireEvent.click(within(await screen.findByTestId("bankTransaction-8")).getByText("განაწილება"));

        expect(location()).toBe("/bankTransactionEdit/8");
    });

    it("filters by the URL and keeps the filter in it", async () => {
        const calls = serve();
        renderList("/bankTransactions?dateFrom=2026-11-01&filter=unallocated");

        await screen.findByTestId("bankTransaction-7");
        expect(calls[0].url).toBe(`${base}?dateFrom=2026-11-01&filter=unallocated`);
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue("2026-11-01");
        expect(screen.getByRole("button", { name: "ბოლომდე გაუნაწილებელი" })).toHaveClass("btn-primary");

        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-11-09" } });
        await waitFor(() =>
            expect(location()).toBe("/bankTransactions?dateFrom=2026-11-01&dateTo=2026-11-09&filter=unallocated")
        );
        fireEvent.click(screen.getByRole("button", { name: "არ არის მოსწავლის" }));
        await waitFor(() =>
            expect(location()).toBe("/bankTransactions?dateFrom=2026-11-01&dateTo=2026-11-09&filter=ignored")
        );
        fireEvent.click(screen.getByRole("button", { name: "ყველა" }));
        await waitFor(() => expect(location()).toBe("/bankTransactions?dateFrom=2026-11-01&dateTo=2026-11-09"));
        await waitFor(() => expect(calls[calls.length - 1].url).toBe(`${base}?dateFrom=2026-11-01&dateTo=2026-11-09`));
    });

    it("says when there are no transactions", async () => {
        serve(() => ({ status: 200, body: [] }));
        renderList();

        expect(await screen.findByText("მონაცემები არ არის")).toBeInTheDocument();
    });

    it("imports from the bank, shows the summary and reloads the list", async () => {
        const calls = serve();
        renderList();
        await screen.findByTestId("bankTransaction-7");

        fireEvent.click(screen.getByRole("button", { name: "ბანკიდან განახლება" }));

        const summary = await screen.findByTestId("importSummary");
        expect([...summary.children].map((line) => line.textContent)).toEqual([
            "TBC Bank: მიღებულია 4 ჩარიცხვა (2026-11-06 – 2026-11-09), აქედან ახალი 3: განაწილდა 2, გაუნაწილებელია 1",
            "Bank of Georgia: rate limited",
        ]);
        expect(calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual([`${base}/import`]);
        await waitFor(() => expect(calls.filter((c) => c.method === "GET")).toHaveLength(2));
    });

    it("shows a failed import", async () => {
        serve((call) =>
            call.method === "POST"
                ? { status: 400, body: { title: "BankIsNotConfigured", detail: "not configured", status: 400 } }
                : undefined!
        );
        renderList();
        await screen.findByTestId("bankTransaction-7");

        fireEvent.click(screen.getByRole("button", { name: "ბანკიდან განახლება" }));

        expect(await screen.findByText(/not configured|BankIsNotConfigured/)).toBeInTheDocument();
        expect(screen.queryByTestId("importSummary")).not.toBeInTheDocument();
    });

    it("shows a failed load", async () => {
        serve(() => ({ status: 500, body: { title: "Failed", detail: "server failed", status: 500 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    it.each<[MenuState, string]>([
        ["withoutRight", "ბანკის ჩარიცხვების ნახვის უფლება არ გაქვთ"],
        ["loading", "მიმდინარეობს ჩატვირთვა"],
    ])("with the menu %s asks nothing", async (menu, text) => {
        const calls = serve();
        renderList("/bankTransactions", menu);

        expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });
});
