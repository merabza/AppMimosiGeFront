//studentContractsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import {
    createStudentContractsStore,
    decodeFilterSortRequest,
} from "../../testUtils/studentContractsTestStore";
import { studentContractsApi } from "./studentContractsApi";
import type { IStudentContractRequest } from "../types/studentContractsTypes";

const base = `${testBaseUrl}/studentcontracts`;

const request: IStudentContractRequest = {
    contractNumber: "6.001",
    contractDate: "2026-09-29",
    studentHumanId: 1,
    payerHumanId: 1,
    academicYearId: 11,
    studentStatusId: null,
    desiredMonthlyPaymentDay: 15,
    details: [],
};

const serverError = {
    status: 409,
    body: {
        title: "StudentContractIsInUse",
        detail: "in use",
        status: 409,
    },
};

describe("studentContractsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({
            status: 200,
            body: { allRowsCount: 0, offset: 0, rows: [] },
        }));
        const store = createStudentContractsStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [{ fieldName: "search", value: "ბერი" }],
            sortByFields: [],
        };

        await store.dispatch(
            studentContractsApi.endpoints.getStudentContractsRowsData.initiate(
                filterSortRequest
            )
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: {} }));
        const store = createStudentContractsStore();

        await store.dispatch(
            studentContractsApi.endpoints.getStudentContractFormLookups.initiate()
        );

        expect(calls[0].url).toBe(`${base}/formlookups`);
    });

    it("URL-encodes the human search text", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [] }));
        const store = createStudentContractsStore();

        await store.dispatch(
            studentContractsApi.endpoints.searchHumans.initiate("ა ბ&")
        );

        expect(calls[0].url).toBe(
            `${base}/humans?search=${encodeURIComponent("ა ბ&")}`
        );
    });

    it("loads one contract by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { scId: 7 } }));
        const store = createStudentContractsStore();

        const result = await store.dispatch(
            studentContractsApi.endpoints.getStudentContract.initiate(7)
        );

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual({ scId: 7 });
    });

    // a closed contract is dropped from the cache, so opening it again always loads it from the server
    it("loads a contract again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { scId: 7 } }));
        const store = createStudentContractsStore();
        const first = store.dispatch(studentContractsApi.endpoints.getStudentContract.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(
                studentContractsApi.endpoints.getStudentContract.select(7)(store.getState())
                    .isUninitialized
            ).toBe(true)
        );
        await store.dispatch(studentContractsApi.endpoints.getStudentContract.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? 128 : undefined,
        }));
        const store = createStudentContractsStore();

        const created = await store.dispatch(
            studentContractsApi.endpoints.createStudentContract.initiate(request)
        );
        await store.dispatch(
            studentContractsApi.endpoints.updateStudentContract.initiate({
                scId: 128,
                request,
            })
        );
        await store.dispatch(
            studentContractsApi.endpoints.deleteStudentContract.initiate(128)
        );

        expect(created.data).toBe(128);
        expect(calls.map((c) => [c.method, c.url])).toEqual([
            ["POST", base],
            ["PUT", `${base}/128`],
            ["DELETE", `${base}/128`],
        ]);
        expect(calls[0].body).toEqual(request);
        expect(calls[1].body).toEqual(request);
    });

    it("writes a failed load into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createStudentContractsStore();

        await store.dispatch(
            studentContractsApi.endpoints.getStudentContract.initiate(1)
        );

        expect(store.getState().alertState.alert.ApiLoad).toEqual([
            { errorCode: "StudentContractIsInUse", errorMessage: "in use" },
        ]);
    });

    it("writes failed search, lookups and rows loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createStudentContractsStore();

        await store.dispatch(
            studentContractsApi.endpoints.searchHumans.initiate("ab")
        );
        await store.dispatch(
            studentContractsApi.endpoints.getStudentContractFormLookups.initiate()
        );
        await store.dispatch(
            studentContractsApi.endpoints.getStudentContractsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(3);
    });

    it("writes failed changes into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createStudentContractsStore();

        await store.dispatch(
            studentContractsApi.endpoints.createStudentContract.initiate(request)
        );
        await store.dispatch(
            studentContractsApi.endpoints.updateStudentContract.initiate({
                scId: 1,
                request,
            })
        );
        await store.dispatch(
            studentContractsApi.endpoints.deleteStudentContract.initiate(1)
        );

        // the same error code is kept once
        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "StudentContractIsInUse", errorMessage: "in use" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("is registered in the store under its own key", () => {
        expect(studentContractsApi.reducerPath).toBe("studentContractsApi");
    });

    it("reloads an open contract after it is updated", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { scId: 3 } : undefined,
        }));
        const store = createStudentContractsStore();
        const open = store.dispatch(
            studentContractsApi.endpoints.getStudentContract.initiate(3)
        );
        await open;

        await store.dispatch(
            studentContractsApi.endpoints.updateStudentContract.initiate({
                scId: 3,
                request,
            })
        );

        await waitFor(() =>
            expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/3"))).toHaveLength(2)
        );
        open.unsubscribe();
    });

    it("reloads the list after a change", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { allRowsCount: 0, offset: 0, rows: [] } : 1,
        }));
        const store = createStudentContractsStore();
        const list = store.dispatch(
            studentContractsApi.endpoints.getStudentContractsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        await list;

        await store.dispatch(
            studentContractsApi.endpoints.deleteStudentContract.initiate(5)
        );

        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2)
        );
        list.unsubscribe();
    });
});
