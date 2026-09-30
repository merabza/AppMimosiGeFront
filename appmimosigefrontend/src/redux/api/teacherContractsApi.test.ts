//teacherContractsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import { createTeacherContractsStore } from "../../testUtils/teacherContractsTestStore";
import { teacherContractsApi } from "./teacherContractsApi";
import type { ITeacherContractRequest } from "../types/teacherContractsTypes";

const base = `${testBaseUrl}/teachercontracts`;

const request: ITeacherContractRequest = {
    contractNumber: "T3.01",
    contractDate: "2026-09-30",
    teacherHumanId: 1,
    bankAccount: null,
    bankAccountCode: null,
    pensionScheme: true,
    indEnt: false,
    rsQuoteTypeId: 1,
    rsCountryId: 1,
    fixedAmount: 0,
    nextMonth: false,
    description: null,
    salarySchemaByHoursId: null,
    workHourGroupId: null,
    workHoursStart: "12:00:00",
    workHoursEnd: "18:00:00",
    contractEndDate: null,
};

const serverError = {
    status: 409,
    body: {
        title: "TeacherContractIsInUse",
        detail: "in use",
        status: 409,
    },
};

const emptyRows = { allRowsCount: 0, offset: 0, rows: [] };

describe("teacherContractsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createTeacherContractsStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [
                { fieldName: "activeOnly", value: "true" },
                { fieldName: "search", value: "ბერი" },
            ],
            sortByFields: [{ fieldName: "fixedAmount", ascending: false }],
        };

        const result = await store.dispatch(
            teacherContractsApi.endpoints.getTeacherContractsRowsData.initiate(
                filterSortRequest
            )
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    it("loads the form lookups", async () => {
        const lookups = { rsQuoteTypes: [], rsCountries: [], salarySchemes: [], workHourGroups: [] };
        const calls = mockFetch(() => ({ status: 200, body: lookups }));
        const store = createTeacherContractsStore();

        const result = await store.dispatch(
            teacherContractsApi.endpoints.getTeacherContractFormLookups.initiate()
        );

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(lookups);
    });

    it("searches humans through its own endpoint with the text URL-encoded", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [{ id: 1, name: "A B" }] }));
        const store = createTeacherContractsStore();

        const result = await store.dispatch(
            teacherContractsApi.endpoints.searchTeacherHumans.initiate("ა ბ&")
        );

        expect(calls[0].url).toBe(`${base}/humans?search=${encodeURIComponent("ა ბ&")}`);
        expect(result.data).toEqual([{ id: 1, name: "A B" }]);
    });

    it("loads one contract by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createTeacherContractsStore();

        const result = await store.dispatch(
            teacherContractsApi.endpoints.getTeacherContract.initiate(7)
        );

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual({ id: 7 });
    });

    // a closed contract is dropped from the cache, so opening it again always loads it from the server
    it("loads a contract again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { id: 7 } }));
        const store = createTeacherContractsStore();
        const first = store.dispatch(teacherContractsApi.endpoints.getTeacherContract.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(
                teacherContractsApi.endpoints.getTeacherContract.select(7)(store.getState())
                    .isUninitialized
            ).toBe(true)
        );
        await store.dispatch(teacherContractsApi.endpoints.getTeacherContract.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? 31 : undefined,
        }));
        const store = createTeacherContractsStore();

        const created = await store.dispatch(
            teacherContractsApi.endpoints.createTeacherContract.initiate(request)
        );
        await store.dispatch(
            teacherContractsApi.endpoints.updateTeacherContract.initiate({ id: 31, request })
        );
        await store.dispatch(
            teacherContractsApi.endpoints.deleteTeacherContract.initiate(31)
        );

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

    it("writes a failed load into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createTeacherContractsStore();

        await store.dispatch(teacherContractsApi.endpoints.getTeacherContract.initiate(1));

        expect(store.getState().alertState.alert.ApiLoad).toEqual([
            { errorCode: "TeacherContractIsInUse", errorMessage: "in use" },
        ]);
    });

    it("writes failed search, lookups and rows loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createTeacherContractsStore();

        await store.dispatch(teacherContractsApi.endpoints.searchTeacherHumans.initiate("ab"));
        await store.dispatch(teacherContractsApi.endpoints.getTeacherContractFormLookups.initiate());
        await store.dispatch(
            teacherContractsApi.endpoints.getTeacherContractsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(3);
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes failed changes into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createTeacherContractsStore();

        await store.dispatch(teacherContractsApi.endpoints.createTeacherContract.initiate(request));
        await store.dispatch(
            teacherContractsApi.endpoints.updateTeacherContract.initiate({ id: 1, request })
        );
        await store.dispatch(teacherContractsApi.endpoints.deleteTeacherContract.initiate(1));

        // the same error code is kept once
        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "TeacherContractIsInUse", errorMessage: "in use" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { id: 1 } : 1,
        }));
        const store = createTeacherContractsStore();

        await store.dispatch(teacherContractsApi.endpoints.getTeacherContract.initiate(1));
        await store.dispatch(teacherContractsApi.endpoints.createTeacherContract.initiate(request));

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("is registered in the store under its own key", () => {
        expect(teacherContractsApi.reducerPath).toBe("teacherContractsApi");
    });

    it("reloads an open contract after it is updated", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { id: 3 } : undefined,
        }));
        const store = createTeacherContractsStore();
        const open = store.dispatch(teacherContractsApi.endpoints.getTeacherContract.initiate(3));
        await open;

        await store.dispatch(
            teacherContractsApi.endpoints.updateTeacherContract.initiate({ id: 3, request })
        );

        await waitFor(() =>
            expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/3"))).toHaveLength(2)
        );
        open.unsubscribe();
    });

    it.each([
        ["create", (store: ReturnType<typeof createTeacherContractsStore>) =>
            store.dispatch(teacherContractsApi.endpoints.createTeacherContract.initiate(request))],
        ["update", (store: ReturnType<typeof createTeacherContractsStore>) =>
            store.dispatch(teacherContractsApi.endpoints.updateTeacherContract.initiate({ id: 5, request }))],
        ["delete", (store: ReturnType<typeof createTeacherContractsStore>) =>
            store.dispatch(teacherContractsApi.endpoints.deleteTeacherContract.initiate(5))],
    ])("reloads the list after a %s", async (_name, change) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? emptyRows : 1,
        }));
        const store = createTeacherContractsStore();
        const list = store.dispatch(
            teacherContractsApi.endpoints.getTeacherContractsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        await list;

        await change(store);

        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2)
        );
        list.unsubscribe();
    });
});
