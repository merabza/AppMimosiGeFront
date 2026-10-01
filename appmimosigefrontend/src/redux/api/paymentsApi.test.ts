//paymentsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import { createPaymentsStore, paymentLookups } from "../../testUtils/paymentsTestStore";
import { paymentsApi } from "./paymentsApi";
import type { IPaymentRequest } from "../types/paymentsTypes";

const base = `${testBaseUrl}/payments`;

const request: IPaymentRequest = {
    studentContractId: 10,
    payDate: "2026-09-15",
    amount: -20.5,
    document: "transfer",
    bankAccountId: 9,
    checked: false,
};

const serverError = {
    status: 409,
    body: { title: "PaymentIsChecked", detail: "checked", status: 409 },
};

const emptyRows = { allRowsCount: 0, offset: 0, totalAmount: 0, rows: [] };

const listRequest = { offset: 0, rowsCount: 10, filterFields: [], sortByFields: [] };

describe("paymentsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createPaymentsStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [
                { fieldName: "bankAccountId", value: "4" },
                { fieldName: "dateFrom", value: "2026-09-01" },
            ],
            sortByFields: [{ fieldName: "amount", ascending: false }],
        };

        const result = await store.dispatch(
            paymentsApi.endpoints.getPaymentsRowsData.initiate(filterSortRequest)
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: paymentLookups }));
        const store = createPaymentsStore();

        const result = await store.dispatch(paymentsApi.endpoints.getPaymentFormLookups.initiate());

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(paymentLookups);
    });

    it("loads the contracts of an academic year", async () => {
        const contracts = [{ id: 10, name: "Alpha Ann 6.001" }];
        const calls = mockFetch(() => ({ status: 200, body: contracts }));
        const store = createPaymentsStore();

        const result = await store.dispatch(
            paymentsApi.endpoints.getPaymentStudentContracts.initiate(11)
        );

        expect(calls[0].url).toBe(`${base}/studentcontracts?academicYearId=11`);
        expect(result.data).toEqual(contracts);
    });

    it("loads one payment by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createPaymentsStore();

        const result = await store.dispatch(paymentsApi.endpoints.getPayment.initiate(7));

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual({ id: 7 });
    });

    // a closed payment is dropped from the cache, so opening it again always loads it from the server
    it("loads a payment again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createPaymentsStore();
        const first = store.dispatch(paymentsApi.endpoints.getPayment.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(
                paymentsApi.endpoints.getPayment.select(7)(store.getState()).isUninitialized
            ).toBe(true)
        );
        await store.dispatch(paymentsApi.endpoints.getPayment.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? 31 : undefined,
        }));
        const store = createPaymentsStore();

        const created = await store.dispatch(paymentsApi.endpoints.createPayment.initiate(request));
        await store.dispatch(
            paymentsApi.endpoints.updatePayment.initiate({ paymentId: 31, request })
        );
        await store.dispatch(paymentsApi.endpoints.deletePayment.initiate(31));

        expect(created.data).toBe(31);
        expect(calls.map((c) => [c.method, c.url])).toEqual([
            ["POST", base],
            ["PUT", `${base}/31`],
            ["DELETE", `${base}/31`],
        ]);
        expect(calls[0].body).toEqual(request);
        expect(calls[1].body).toEqual(request);
        expect(calls[2].body).toBeUndefined();
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createPaymentsStore();

        await store.dispatch(paymentsApi.endpoints.getPayment.initiate(1));
        await store.dispatch(paymentsApi.endpoints.getPaymentFormLookups.initiate());
        await store.dispatch(paymentsApi.endpoints.getPaymentStudentContracts.initiate(11));
        await store.dispatch(paymentsApi.endpoints.getPaymentsRowsData.initiate(listRequest));

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(4);
        expect(store.getState().alertState.alert.ApiLoad?.[0]).toEqual({
            errorCode: "PaymentIsChecked",
            errorMessage: "checked",
        });
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes failed changes into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createPaymentsStore();

        await store.dispatch(paymentsApi.endpoints.createPayment.initiate(request));
        await store.dispatch(paymentsApi.endpoints.updatePayment.initiate({ paymentId: 1, request }));
        await store.dispatch(paymentsApi.endpoints.deletePayment.initiate(1));

        // the same error code is kept once
        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "PaymentIsChecked", errorMessage: "checked" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { id: 1 } : 1,
        }));
        const store = createPaymentsStore();

        await store.dispatch(paymentsApi.endpoints.getPayment.initiate(1));
        await store.dispatch(paymentsApi.endpoints.createPayment.initiate(request));

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("is registered in the store under its own key", () => {
        expect(paymentsApi.reducerPath).toBe("paymentsApi");
    });

    it.each([
        [
            "create",
            (store: ReturnType<typeof createPaymentsStore>) =>
                store.dispatch(paymentsApi.endpoints.createPayment.initiate(request)),
        ],
        [
            "update",
            (store: ReturnType<typeof createPaymentsStore>) =>
                store.dispatch(
                    paymentsApi.endpoints.updatePayment.initiate({ paymentId: 5, request })
                ),
        ],
        [
            "delete",
            (store: ReturnType<typeof createPaymentsStore>) =>
                store.dispatch(paymentsApi.endpoints.deletePayment.initiate(5)),
        ],
    ])("reloads the list after a %s", async (_name, change) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? emptyRows : 1,
        }));
        const store = createPaymentsStore();
        const list = store.dispatch(paymentsApi.endpoints.getPaymentsRowsData.initiate(listRequest));
        await list;

        await change(store);

        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2)
        );
        list.unsubscribe();
    });
});
