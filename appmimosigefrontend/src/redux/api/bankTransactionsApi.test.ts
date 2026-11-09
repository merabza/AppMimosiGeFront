//bankTransactionsApi.test.ts

import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { createBankTransactionsStore } from "../../testUtils/bankTransactionsTestStore";
import { bankTransactionsApi, bankTransactionsQueryString } from "./bankTransactionsApi";

const base = `${testBaseUrl}/banktransactions`;

const serverError = {
    status: 409,
    body: { title: "SomethingFailed", detail: "failed", status: 409 },
};

describe("bankTransactionsQueryString", () => {
    it("sends only the set parameters", () => {
        expect(bankTransactionsQueryString({ dateFrom: "2026-11-01", dateTo: "2026-11-09", filter: "ignored" })).toBe(
            "dateFrom=2026-11-01&dateTo=2026-11-09&filter=ignored"
        );
        expect(bankTransactionsQueryString({ dateFrom: "", dateTo: "", filter: "" })).toBe("");
    });
});

describe("bankTransactionsApi", () => {
    it("loads the list with and without parameters", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [] }));
        const store = createBankTransactionsStore();

        await store.dispatch(
            bankTransactionsApi.endpoints.getBankTransactions.initiate({ dateFrom: "", dateTo: "", filter: "" })
        );
        await store.dispatch(
            bankTransactionsApi.endpoints.getBankTransactions.initiate({
                dateFrom: "",
                dateTo: "2026-11-09",
                filter: "unallocated",
            })
        );

        expect(calls.map((c) => [c.method, c.url, c.authorization])).toEqual([
            ["GET", base, "Bearer token"],
            ["GET", `${base}?dateTo=2026-11-09&filter=unallocated`, "Bearer token"],
        ]);
    });

    it("loads one transaction and the year's contracts", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [] }));
        const store = createBankTransactionsStore();

        await store.dispatch(bankTransactionsApi.endpoints.getBankTransaction.initiate(7));
        await store.dispatch(bankTransactionsApi.endpoints.getBankTransactionStudentContracts.initiate(11));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/studentcontracts?academicYearId=11`]);
    });

    it("imports, allocates and marks", async () => {
        const calls = mockFetch(() => ({ status: 200 }));
        const store = createBankTransactionsStore();

        await store.dispatch(bankTransactionsApi.endpoints.importBankTransactions.initiate());
        await store.dispatch(
            bankTransactionsApi.endpoints.setBankTransactionAllocation.initiate({
                bankTransactionId: 7,
                shares: [{ studentContractId: 10, amount: 60 }],
            })
        );
        await store.dispatch(
            bankTransactionsApi.endpoints.setBankTransactionIgnored.initiate({ bankTransactionId: 7, ignored: true })
        );

        expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
            ["POST", `${base}/import`, undefined],
            ["PUT", `${base}/7/allocation`, { shares: [{ studentContractId: 10, amount: 60 }] }],
            ["PUT", `${base}/7/ignored`, { ignored: true }],
        ]);
    });

    // a change reloads the list
    it("reloads the list after a change", async () => {
        const calls = mockFetch((call) => (call.method === "GET" ? { status: 200, body: [] } : { status: 200 }));
        const store = createBankTransactionsStore();
        const subscription = store.dispatch(
            bankTransactionsApi.endpoints.getBankTransactions.initiate({ dateFrom: "", dateTo: "", filter: "" })
        );
        await subscription;

        await store.dispatch(
            bankTransactionsApi.endpoints.setBankTransactionIgnored.initiate({ bankTransactionId: 7, ignored: false })
        );

        await expect.poll(() => calls.filter((c) => c.method === "GET").length).toBe(2);
        subscription.unsubscribe();
    });

    it("puts load errors into ApiLoad and change errors into ApiMutation", async () => {
        mockFetch(() => serverError);
        const store = createBankTransactionsStore();

        await store.dispatch(bankTransactionsApi.endpoints.getBankTransaction.initiate(7));
        await store.dispatch(bankTransactionsApi.endpoints.getBankTransactionStudentContracts.initiate(11));
        await store.dispatch(bankTransactionsApi.endpoints.importBankTransactions.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(2);
        expect(store.getState().alertState.alert.ApiMutation).toHaveLength(1);
    });
});
