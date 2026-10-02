//workHoursApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import {
    createWorkHoursStore,
    workHourData,
    workHourLookups,
    workHoursRows,
    type WorkHoursStore,
} from "../../testUtils/workHoursTestStore";
import { workHoursApi } from "./workHoursApi";
import type { IWorkHourRequest, IWorkTimeFixRequest } from "../types/workHoursTypes";

const base = `${testBaseUrl}/workhours`;

const request: IWorkHourRequest = {
    teacherContractId: 1,
    whStart: "2026-09-15T11:55:12",
    whEnd: "2026-09-15T18:05:00",
};

const fixRequest: IWorkTimeFixRequest = { teacherContractId: 1, luftMinutes: 5 };

const period = { dateFrom: "2026-09-01", dateTo: "2026-09-30" };

const serverError = {
    status: 409,
    body: { title: "TodayRecordExists", detail: "has a record", status: 409 },
};

const listRequest = { offset: 0, rowsCount: 10, filterFields: [], sortByFields: [] };

// every change of the list, as the page runs it
const changes: [string, (store: WorkHoursStore) => unknown][] = [
    ["create", (store) => store.dispatch(workHoursApi.endpoints.createWorkHour.initiate(request))],
    ["update", (store) => store.dispatch(workHoursApi.endpoints.updateWorkHour.initiate({ whId: 7, request }))],
    ["delete", (store) => store.dispatch(workHoursApi.endpoints.deleteWorkHour.initiate(7))],
    ["start", (store) => store.dispatch(workHoursApi.endpoints.startWork.initiate(fixRequest))],
    ["end", (store) => store.dispatch(workHoursApi.endpoints.endWork.initiate(fixRequest))],
    ["auto generation", (store) => store.dispatch(workHoursApi.endpoints.autoGenerateWorkHours.initiate(period))],
];

describe("workHoursApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: workHoursRows() }));
        const store = createWorkHoursStore();
        const filterSortRequest = {
            offset: 0,
            rowsCount: 5,
            filterFields: [{ fieldName: "teacherContractId", value: "15" }],
            sortByFields: [{ fieldName: "whStart", ascending: false }],
        };

        const result = await store.dispatch(workHoursApi.endpoints.getWorkHoursRowsData.initiate(filterSortRequest));

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(workHoursRows());
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: workHourLookups }));
        const store = createWorkHoursStore();

        const result = await store.dispatch(workHoursApi.endpoints.getWorkHourFormLookups.initiate());

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(workHourLookups);
    });

    it("loads one record by id", async () => {
        const calls = mockFetch(() => ({ status: 200, body: workHourData() }));
        const store = createWorkHoursStore();

        const result = await store.dispatch(workHoursApi.endpoints.getWorkHour.initiate(7));

        expect(calls[0].url).toBe(`${base}/7`);
        expect(result.data).toEqual(workHourData());
    });

    // a closed record is dropped from the cache, so opening it again always loads it from the server
    it("loads a record again when it is opened after being closed", async () => {
        const calls = mockFetch(() => ({ status: 200, body: workHourData() }));
        const store = createWorkHoursStore();
        const first = store.dispatch(workHoursApi.endpoints.getWorkHour.initiate(7));
        await first;

        first.unsubscribe();
        await waitFor(() =>
            expect(workHoursApi.endpoints.getWorkHour.select(7)(store.getState()).isUninitialized).toBe(true)
        );
        await store.dispatch(workHoursApi.endpoints.getWorkHour.initiate(7));

        expect(calls.map((c) => c.url)).toEqual([`${base}/7`, `${base}/7`]);
    });

    it("creates, updates and deletes with the right methods and bodies", async () => {
        const calls = mockFetch((call) => ({ status: 200, body: call.method === "POST" ? 31 : undefined }));
        const store = createWorkHoursStore();

        const created = await store.dispatch(workHoursApi.endpoints.createWorkHour.initiate(request));
        await store.dispatch(workHoursApi.endpoints.updateWorkHour.initiate({ whId: 31, request }));
        await store.dispatch(workHoursApi.endpoints.deleteWorkHour.initiate(31));

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

    it("fixes the start and the end and generates with POST", async () => {
        const generated = { createdCount: 57 };
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/autogenerate") ? generated : workHourData(),
        }));
        const store = createWorkHoursStore();

        const started = await store.dispatch(workHoursApi.endpoints.startWork.initiate(fixRequest));
        const ended = await store.dispatch(workHoursApi.endpoints.endWork.initiate({ ...fixRequest, luftMinutes: null }));
        const result = await store.dispatch(workHoursApi.endpoints.autoGenerateWorkHours.initiate(period));

        expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
            ["POST", `${base}/start`, fixRequest],
            ["POST", `${base}/end`, { teacherContractId: 1, luftMinutes: null }],
            ["POST", `${base}/autogenerate`, period],
        ]);
        expect(started.data).toEqual(workHourData());
        expect(ended.data).toEqual(workHourData());
        expect(result.data).toEqual(generated);
    });

    it.each(changes)("reloads the list after a %s", async (_name, change) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "GET" ? workHoursRows() : workHourData(),
        }));
        const store = createWorkHoursStore();
        store.dispatch(workHoursApi.endpoints.getWorkHoursRowsData.initiate(listRequest));
        await waitFor(() => expect(calls).toHaveLength(1));

        await change(store);

        await waitFor(() => expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(2));
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createWorkHoursStore();

        await store.dispatch(workHoursApi.endpoints.getWorkHour.initiate(1));
        await store.dispatch(workHoursApi.endpoints.getWorkHourFormLookups.initiate());
        await store.dispatch(workHoursApi.endpoints.getWorkHoursRowsData.initiate(listRequest));

        // setAlertApiLoadError appends every failure
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(3);
        expect(store.getState().alertState.alert.ApiLoad?.[0]).toEqual({
            errorCode: "TodayRecordExists",
            errorMessage: "has a record",
        });
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    // the alerts keep an error code once, so each change is checked on its own
    it.each(changes)("writes a failed %s into the ApiMutation alerts", async (_name, change) => {
        mockFetch(() => serverError);
        const store = createWorkHoursStore();

        await change(store);

        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "TodayRecordExists", errorMessage: "has a record" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({ status: 200, body: call.method === "GET" ? workHourData() : 1 }));
        const store = createWorkHoursStore();

        await store.dispatch(workHoursApi.endpoints.getWorkHour.initiate(1));
        await store.dispatch(workHoursApi.endpoints.createWorkHour.initiate(request));

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });
});
