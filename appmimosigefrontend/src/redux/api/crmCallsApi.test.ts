//crmCallsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import {
    createCrmCallsStore,
    crmCallLookups,
    type CrmCallsStore,
} from "../../testUtils/crmCallsTestStore";
import { crmCallsApi } from "./crmCallsApi";
import type { ICrmCallRequest } from "../types/crmCallsTypes";

const base = `${testBaseUrl}/crmcalls`;

const request: ICrmCallRequest = {
    studentContractId: 10,
    callTypeId: 1,
    callDate: "2026-10-01T10:15:00",
    answerTypeId: 3,
    callConversation: "will pay",
    mustPayDate: "2026-10-08",
};

const serverError = {
    status: 400,
    body: { title: "AnswerTypeIsRequired", detail: "no result", status: 400 },
};

const emptyRows = { allRowsCount: 0, offset: 0, rows: [] };

const listRequest = { offset: 0, rowsCount: 10, filterFields: [], sortByFields: [] };

describe("crmCallsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createCrmCallsStore();
        const filterSortRequest = {
            offset: 0,
            rowsCount: 5,
            filterFields: [{ fieldName: "studentContractId", value: "10" }],
            sortByFields: [{ fieldName: "callDate", ascending: false }],
        };

        const result = await store.dispatch(
            crmCallsApi.endpoints.getCrmCallsRowsData.initiate(filterSortRequest)
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: crmCallLookups }));
        const store = createCrmCallsStore();

        const result = await store.dispatch(crmCallsApi.endpoints.getCrmCallFormLookups.initiate());

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(crmCallLookups);
    });

    it("loads the contracts of an academic year", async () => {
        const contracts = [{ id: 10, name: "Alpha Ann / 6.001" }];
        const calls = mockFetch(() => ({ status: 200, body: contracts }));
        const store = createCrmCallsStore();

        const result = await store.dispatch(
            crmCallsApi.endpoints.getCrmCallStudentContracts.initiate(11)
        );

        expect(calls[0].url).toBe(`${base}/studentcontracts?academicYearId=11`);
        expect(result.data).toEqual(contracts);
    });

    it("loads one call by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createCrmCallsStore();

        const result = await store.dispatch(crmCallsApi.endpoints.getCrmCall.initiate(7));

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual({ id: 7 });
    });

    // a closed call is dropped from the cache, so opening it again always loads it from the server
    it("loads a call again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createCrmCallsStore();
        const first = store.dispatch(crmCallsApi.endpoints.getCrmCall.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(crmCallsApi.endpoints.getCrmCall.select(7)(store.getState()).isUninitialized).toBe(true)
        );
        await store.dispatch(crmCallsApi.endpoints.getCrmCall.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? 31 : undefined,
        }));
        const store = createCrmCallsStore();

        const created = await store.dispatch(crmCallsApi.endpoints.createCrmCall.initiate(request));
        await store.dispatch(crmCallsApi.endpoints.updateCrmCall.initiate({ crmCallId: 31, request }));
        await store.dispatch(crmCallsApi.endpoints.deleteCrmCall.initiate(31));

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

    // the deposits page shows the contract's calls: a saved call reloads them
    it.each([
        ["create", (store: CrmCallsStore) => store.dispatch(crmCallsApi.endpoints.createCrmCall.initiate(request))],
        [
            "update",
            (store: CrmCallsStore) =>
                store.dispatch(crmCallsApi.endpoints.updateCrmCall.initiate({ crmCallId: 31, request })),
        ],
        ["delete", (store: CrmCallsStore) => store.dispatch(crmCallsApi.endpoints.deleteCrmCall.initiate(31))],
    ])("reloads the shown calls after a %s", async (_name, change) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? emptyRows : 31,
        }));
        const store = createCrmCallsStore();
        store.dispatch(crmCallsApi.endpoints.getCrmCallsRowsData.initiate(listRequest));
        await waitFor(() => expect(calls).toHaveLength(1));

        await change(store);

        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2)
        );
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createCrmCallsStore();

        await store.dispatch(crmCallsApi.endpoints.getCrmCall.initiate(1));
        await store.dispatch(crmCallsApi.endpoints.getCrmCallFormLookups.initiate());
        await store.dispatch(crmCallsApi.endpoints.getCrmCallStudentContracts.initiate(11));
        await store.dispatch(crmCallsApi.endpoints.getCrmCallsRowsData.initiate(listRequest));

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(4);
        expect(store.getState().alertState.alert.ApiLoad?.[0]).toEqual({
            errorCode: "AnswerTypeIsRequired",
            errorMessage: "no result",
        });
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    // the alerts keep an error code once, so each change is checked on its own
    it.each([
        ["create", (store: CrmCallsStore) => store.dispatch(crmCallsApi.endpoints.createCrmCall.initiate(request))],
        [
            "update",
            (store: CrmCallsStore) =>
                store.dispatch(crmCallsApi.endpoints.updateCrmCall.initiate({ crmCallId: 1, request })),
        ],
        ["delete", (store: CrmCallsStore) => store.dispatch(crmCallsApi.endpoints.deleteCrmCall.initiate(1))],
    ])("writes a failed %s into the ApiMutation alerts", async (_name, change) => {
        mockFetch(() => serverError);
        const store = createCrmCallsStore();

        await change(store);

        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "AnswerTypeIsRequired", errorMessage: "no result" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { id: 1 } : 1,
        }));
        const store = createCrmCallsStore();

        await store.dispatch(crmCallsApi.endpoints.getCrmCall.initiate(1));
        await store.dispatch(crmCallsApi.endpoints.createCrmCall.initiate(request));

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });
});
