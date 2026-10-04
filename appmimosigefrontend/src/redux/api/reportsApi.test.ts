//reportsApi.test.ts

import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { captureDownloads, mockFetchFiles } from "../../testUtils/salaryTestStore";
import { createReportsStore, reportCatalog, reportLookups, roomsReport } from "../../testUtils/reportsTestStore";
import { reportsApi } from "./reportsApi";

const base = `${testBaseUrl}/reports`;

const serverError = { status: 400, body: { title: "ParameterIsRequired", detail: "required", status: 400 } };

afterEach(() => {
    vi.restoreAllMocks();
});

describe("reportsApi", () => {
    it("loads the catalog", async () => {
        const calls = mockFetch(() => ({ status: 200, body: reportCatalog }));
        const store = createReportsStore();

        const result = await store.dispatch(reportsApi.endpoints.getReportCatalog.initiate());

        expect(result.data).toEqual(reportCatalog);
        expect(calls.map((c) => [c.method, c.url, c.authorization])).toEqual([
            ["GET", `${base}/catalog`, "Bearer token"],
        ]);
    });

    it("loads the lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: reportLookups }));
        const store = createReportsStore();

        const result = await store.dispatch(reportsApi.endpoints.getReportLookups.initiate());

        expect(result.data).toEqual(reportLookups);
        expect(calls.map((c) => c.url)).toEqual([`${base}/lookups`]);
    });

    // a load error goes to ApiLoad: the page shows its load problem
    it("writes a catalog load error to ApiLoad", async () => {
        mockFetch(() => serverError);
        const store = createReportsStore();

        await store.dispatch(reportsApi.endpoints.getReportCatalog.initiate());

        await waitFor(() => expect(store.getState().alertState.alert.ApiLoad).toBeDefined());
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes a lookups load error to ApiLoad", async () => {
        mockFetch(() => serverError);
        const store = createReportsStore();

        await store.dispatch(reportsApi.endpoints.getReportLookups.initiate());

        await waitFor(() => expect(store.getState().alertState.alert.ApiLoad).toBeDefined());
    });

    it("loads a report with its parameters in the link", async () => {
        const calls = mockFetch(() => ({ status: 200, body: roomsReport() }));
        const store = createReportsStore();

        const result = await store.dispatch(
            reportsApi.endpoints.getReport.initiate({ key: "r03RoomsAgenda", query: "endDate=2026-10-02" })
        );

        expect(result.data).toEqual(roomsReport());
        expect(calls.map((c) => [c.method, c.url])).toEqual([["GET", `${base}/r03RoomsAgenda?endDate=2026-10-02`]]);
    });

    it("loads a report without parameters without a question mark", async () => {
        const calls = mockFetch(() => ({ status: 200, body: roomsReport() }));
        const store = createReportsStore();

        await store.dispatch(reportsApi.endpoints.getReport.initiate({ key: "r13LessonsWithErrors", query: "" }));

        expect(calls.map((c) => c.url)).toEqual([`${base}/r13LessonsWithErrors`]);
    });

    // the key is part of the address, so it is encoded
    it("encodes the key", async () => {
        const calls = mockFetch(() => ({ status: 200, body: roomsReport() }));
        const store = createReportsStore();

        await store.dispatch(reportsApi.endpoints.getReport.initiate({ key: "a/b", query: "" }));

        expect(calls.map((c) => c.url)).toEqual([`${base}/a%2Fb`]);
    });

    // a report error stays on the page, under the filters
    it("writes a report error to ApiMutation", async () => {
        mockFetch(() => serverError);
        const store = createReportsStore();

        await store.dispatch(reportsApi.endpoints.getReport.initiate({ key: "r03RoomsAgenda", query: "" }));

        await waitFor(() => expect(store.getState().alertState.alert.ApiMutation).toBeDefined());
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    // a closed report is not kept: the same filter later reads the data again
    it("does not keep an unused report", async () => {
        mockFetch(() => ({ status: 200, body: roomsReport() }));
        const store = createReportsStore();

        const subscription = store.dispatch(
            reportsApi.endpoints.getReport.initiate({ key: "r03RoomsAgenda", query: "endDate=2026-10-02" })
        );
        await subscription;
        subscription.unsubscribe();

        await waitFor(() => expect(store.getState().reportsApi.queries).toEqual({}));
    });

    it("downloads the Excel file with the given name", async () => {
        const calls = mockFetchFiles(() => ({ status: 200, text: "xlsx" }));
        const saved = captureDownloads();
        const store = createReportsStore();

        const result = await store.dispatch(
            reportsApi.endpoints.downloadReportExcel.initiate({
                key: "r03RoomsAgenda",
                query: "endDate=2026-10-02",
                fileName: "r03RoomsAgenda_2026-10-02.xlsx",
            })
        );

        expect(result.data).toBe("r03RoomsAgenda_2026-10-02.xlsx");
        expect(calls.map((c) => [c.method, c.url])).toEqual([
            ["GET", `${base}/r03RoomsAgenda/excel?endDate=2026-10-02`],
        ]);
        expect(saved.map((s) => s.fileName)).toEqual(["r03RoomsAgenda_2026-10-02.xlsx"]);
        expect(await saved[0].blob.text()).toBe("xlsx");
    });

    it("downloads the file of a report without parameters without a question mark", async () => {
        const calls = mockFetchFiles(() => ({ status: 200, text: "xlsx" }));
        captureDownloads();
        const store = createReportsStore();

        await store.dispatch(
            reportsApi.endpoints.downloadReportExcel.initiate({ key: "rNone", query: "", fileName: "rNone.xlsx" })
        );

        expect(calls.map((c) => c.url)).toEqual([`${base}/rNone/excel`]);
    });

    it("writes a file error to ApiMutation and saves nothing", async () => {
        mockFetchFiles(() => ({
            status: 403,
            text: JSON.stringify([{ code: "InsufficientRights", name: "უფლება არ გაქვთ" }]),
            headers: { "Content-Type": "application/json" },
        }));
        const saved = captureDownloads();
        const store = createReportsStore();

        await store.dispatch(
            reportsApi.endpoints.downloadReportExcel.initiate({ key: "r06RoomOver", query: "", fileName: "x.xlsx" })
        );

        await waitFor(() => expect(store.getState().alertState.alert.ApiMutation).toBeDefined());
        expect(saved).toEqual([]);
    });
});
