//chargesAndPaymentsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import { balancesLookups, createBalancesStore } from "../../testUtils/balancesTestStore";
import { chargesAndPaymentsApi } from "./chargesAndPaymentsApi";

const base = `${testBaseUrl}/chargesandpayments`;

const emptyRows = { allRowsCount: 0, offset: 0, startBalance: 0, endBalance: 0, rows: [] };

const serverError = {
    status: 400,
    body: { title: "FilterSortRequestIsInvalid", detail: "invalid", status: 400 },
};

describe("chargesAndPaymentsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createBalancesStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [{ fieldName: "studentContractId", value: "35" }],
            sortByFields: [],
        };

        const result = await store.dispatch(
            chargesAndPaymentsApi.endpoints.getStatementRowsData.initiate(filterSortRequest)
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    // charges and payments change on other pages, so a statement is loaded again every time it is opened
    it("loads the statement again after it was closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createBalancesStore();
        const request = { offset: 0, rowsCount: 10, filterFields: [], sortByFields: [] };
        const first = store.dispatch(chargesAndPaymentsApi.endpoints.getStatementRowsData.initiate(request));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(
                chargesAndPaymentsApi.endpoints.getStatementRowsData.select(request)(store.getState())
                    .isUninitialized
            ).toBe(true)
        );
        await store.dispatch(chargesAndPaymentsApi.endpoints.getStatementRowsData.initiate(request));

        expect(calls).toHaveLength(2);
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: balancesLookups }));
        const store = createBalancesStore();

        const result = await store.dispatch(
            chargesAndPaymentsApi.endpoints.getStatementFormLookups.initiate()
        );

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(balancesLookups);
    });

    it("loads the contracts of an academic year from its own endpoint", async () => {
        const contracts = [{ id: 10, name: "Alpha Ann 6.001" }];
        const calls = mockFetch(() => ({ status: 200, body: contracts }));
        const store = createBalancesStore();

        const result = await store.dispatch(
            chargesAndPaymentsApi.endpoints.getStatementStudentContracts.initiate(11)
        );

        expect(calls[0].url).toBe(`${base}/studentcontracts?academicYearId=11`);
        expect(result.data).toEqual(contracts);
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createBalancesStore();

        await store.dispatch(
            chargesAndPaymentsApi.endpoints.getStatementRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        await store.dispatch(chargesAndPaymentsApi.endpoints.getStatementFormLookups.initiate());
        await store.dispatch(chargesAndPaymentsApi.endpoints.getStatementStudentContracts.initiate(11));

        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(3);
        expect(store.getState().alertState.alert.ApiLoad?.[0]).toEqual({
            errorCode: "FilterSortRequestIsInvalid",
            errorMessage: "invalid",
        });
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch(() => ({ status: 200, body: balancesLookups }));
        const store = createBalancesStore();

        await store.dispatch(chargesAndPaymentsApi.endpoints.getStatementFormLookups.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });
});
