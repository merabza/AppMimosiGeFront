//groupsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import { createGroupsStore, type GroupsStore } from "../../testUtils/groupsTestStore";
import { groupsApi } from "./groupsApi";
import type { IGroupRequest } from "../types/groupsTypes";

const base = `${testBaseUrl}/groups`;

const request: IGroupRequest = {
    academicYearId: 11,
    groupCode: "1001",
    courseId: 6,
    groupSizeId: 2,
    studentStatusId: 10,
    voidDate: null,
    teachers: [
        { id: 0, teacherContractId: 5, salarySchemaId: 8, startDate: "2026-09-30", endDate: null },
    ],
    students: [],
    dayTimePlaces: [],
};

const serverError = {
    status: 409,
    body: { title: "GroupIsInUse", detail: "in use", status: 409 },
};

const emptyRows = { allRowsCount: 0, offset: 0, rows: [] };

const rowsRequest = { offset: 0, rowsCount: 10, filterFields: [], sortByFields: [] };

describe("groupsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createGroupsStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [
                { fieldName: "findMethod", value: "student" },
                { fieldName: "search", value: "ბერი" },
            ],
            sortByFields: [{ fieldName: "endDate", ascending: false }],
        };

        const result = await store.dispatch(
            groupsApi.endpoints.getGroupsRowsData.initiate(filterSortRequest)
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    it("loads the form lookups", async () => {
        const lookups = { currentAcademicYearId: 11, academicYears: [] };
        const calls = mockFetch(() => ({ status: 200, body: lookups }));
        const store = createGroupsStore();

        const result = await store.dispatch(groupsApi.endpoints.getGroupFormLookups.initiate());

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(lookups);
    });

    it("loads the student contracts of an academic year", async () => {
        const contracts = [{ scId: 20, name: "A B / 6.001", tariffs: [] }];
        const calls = mockFetch(() => ({ status: 200, body: contracts }));
        const store = createGroupsStore();

        const result = await store.dispatch(
            groupsApi.endpoints.getGroupStudentContracts.initiate(11)
        );

        expect(calls[0].url).toBe(`${base}/studentcontracts?academicYearId=11`);
        expect(result.data).toEqual(contracts);
    });

    it("loads one group by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { grpId: 7 } }));
        const store = createGroupsStore();

        const result = await store.dispatch(groupsApi.endpoints.getGroup.initiate(7));

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual({ grpId: 7 });
    });

    // a closed group is dropped from the cache, so opening it again always loads it from the server
    it("loads a group again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { grpId: 7 } }));
        const store = createGroupsStore();
        const first = store.dispatch(groupsApi.endpoints.getGroup.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(
                groupsApi.endpoints.getGroup.select(7)(store.getState()).isUninitialized
            ).toBe(true)
        );
        await store.dispatch(groupsApi.endpoints.getGroup.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? 52 : undefined,
        }));
        const store = createGroupsStore();

        const created = await store.dispatch(groupsApi.endpoints.createGroup.initiate(request));
        await store.dispatch(groupsApi.endpoints.updateGroup.initiate({ grpId: 52, request }));
        await store.dispatch(groupsApi.endpoints.deleteGroup.initiate(52));

        expect(created.data).toBe(52);
        expect(calls.map((c) => [c.method, c.url])).toEqual([
            ["POST", base],
            ["PUT", `${base}/52`],
            ["DELETE", `${base}/52`],
        ]);
        expect(calls[0].body).toEqual(request);
        expect(calls[1].body).toEqual(request);
        expect(calls[2].body).toBeUndefined();
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createGroupsStore();

        await store.dispatch(groupsApi.endpoints.getGroup.initiate(1));
        await store.dispatch(groupsApi.endpoints.getGroupFormLookups.initiate());
        await store.dispatch(groupsApi.endpoints.getGroupStudentContracts.initiate(11));
        await store.dispatch(groupsApi.endpoints.getGroupsRowsData.initiate(rowsRequest));

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(4);
        expect(store.getState().alertState.alert.ApiLoad?.[0]).toEqual({
            errorCode: "GroupIsInUse",
            errorMessage: "in use",
        });
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes failed changes into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createGroupsStore();

        await store.dispatch(groupsApi.endpoints.createGroup.initiate(request));
        await store.dispatch(groupsApi.endpoints.updateGroup.initiate({ grpId: 1, request }));
        await store.dispatch(groupsApi.endpoints.deleteGroup.initiate(1));

        // the same error code is kept once
        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "GroupIsInUse", errorMessage: "in use" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes the error of every failed change", async () => {
        mockFetch((call) => ({
            status: 400,
            body: { title: `${call.method}Error`, detail: call.method, status: 400 },
        }));
        const store = createGroupsStore();

        await store.dispatch(groupsApi.endpoints.createGroup.initiate(request));
        await store.dispatch(groupsApi.endpoints.updateGroup.initiate({ grpId: 1, request }));
        await store.dispatch(groupsApi.endpoints.deleteGroup.initiate(1));

        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "POSTError", errorMessage: "POST" },
            { errorCode: "PUTError", errorMessage: "PUT" },
            { errorCode: "DELETEError", errorMessage: "DELETE" },
        ]);
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { grpId: 1 } : 1,
        }));
        const store = createGroupsStore();

        await store.dispatch(groupsApi.endpoints.getGroup.initiate(1));
        await store.dispatch(groupsApi.endpoints.createGroup.initiate(request));

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("is registered in the store under its own key", () => {
        expect(groupsApi.reducerPath).toBe("groupsApi");
    });

    it("reloads an open group after it is updated", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? { grpId: 3 } : undefined,
        }));
        const store = createGroupsStore();
        const open = store.dispatch(groupsApi.endpoints.getGroup.initiate(3));
        await open;

        await store.dispatch(groupsApi.endpoints.updateGroup.initiate({ grpId: 3, request }));

        await waitFor(() =>
            expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/3"))).toHaveLength(2)
        );
        open.unsubscribe();
    });

    it.each([
        ["create", (store: GroupsStore) =>
            store.dispatch(groupsApi.endpoints.createGroup.initiate(request))],
        ["update", (store: GroupsStore) =>
            store.dispatch(groupsApi.endpoints.updateGroup.initiate({ grpId: 5, request }))],
        ["delete", (store: GroupsStore) =>
            store.dispatch(groupsApi.endpoints.deleteGroup.initiate(5))],
    ])("reloads the list after a %s", async (_name, change) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? emptyRows : 1,
        }));
        const store = createGroupsStore();
        const list = store.dispatch(groupsApi.endpoints.getGroupsRowsData.initiate(rowsRequest));
        await list;

        await change(store);

        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2)
        );
        list.unsubscribe();
    });
});
