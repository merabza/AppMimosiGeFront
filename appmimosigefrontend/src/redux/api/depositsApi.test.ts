//depositsApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import {
    balancesLookups,
    createBalancesStore,
    depositsParams,
    recountResult,
} from "../../testUtils/balancesTestStore";
import { depositsApi, depositsQueryString } from "./depositsApi";
import type { IDepositsRequest } from "../types/balancesTypes";

const base = `${testBaseUrl}/deposits`;

const deposits = { totalBalance: 0, totalFourWeekFee: 0, rows: [] };

const request: IDepositsRequest = { academicYearId: "11", maximum: "-50.5", dateTo: "2026-10-06", filter: "call" };

const serverError = {
    status: 409,
    body: { title: "SomethingFailed", detail: "failed", status: 409 },
};

describe("depositsQueryString", () => {
    it("sends every parameter", () => {
        expect(depositsQueryString(request)).toBe(
            "academicYearId=11&maximum=-50.5&dateTo=2026-10-06&filter=call"
        );
    });

    // no year: every year; no filter: the list without a filter; an empty maximum is 0
    it("leaves out an empty year and filter", () => {
        expect(depositsQueryString({ academicYearId: "", maximum: "", dateTo: "2026-10-06", filter: "" })).toBe(
            "maximum=0&dateTo=2026-10-06"
        );
    });
});

describe("depositsApi", () => {
    it("loads the rows with the parameters", async () => {
        const calls = mockFetch(() => ({ status: 200, body: deposits }));
        const store = createBalancesStore();

        const result = await store.dispatch(depositsApi.endpoints.getDeposits.initiate(request));

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rows?`)).toBe(true);
        expect(depositsParams(calls[0].url)).toEqual({
            academicYearId: "11",
            maximum: "-50.5",
            dateTo: "2026-10-06",
            filter: "call",
        });
        expect(calls[0].authorization).toBe("Bearer token");
        expect(result.data).toEqual(deposits);
    });

    it("loads the form lookups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: balancesLookups }));
        const store = createBalancesStore();

        const result = await store.dispatch(depositsApi.endpoints.getDepositsFormLookups.initiate());

        expect(calls[0].url).toBe(`${base}/formlookups`);
        expect(result.data).toEqual(balancesLookups);
    });

    it("posts the dirty and the full recount", async () => {
        const calls = mockFetch(() => ({ status: 200, body: recountResult }));
        const store = createBalancesStore();

        const dirty = await store.dispatch(depositsApi.endpoints.recountBalances.initiate());
        await store.dispatch(depositsApi.endpoints.fullRecountBalances.initiate());

        expect(dirty.data).toEqual(recountResult);
        expect(calls.map((c) => [c.method, c.url])).toEqual([
            ["POST", `${base}/recount`],
            ["POST", `${base}/fullrecount`],
        ]);
    });

    // a recount changes the stored next pay dates, so an open list is loaded again
    it.each([
        ["dirty", depositsApi.endpoints.recountBalances],
        ["full", depositsApi.endpoints.fullRecountBalances],
    ])("loads the open list again after the %s recount", async (_name, endpoint) => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.method === "POST" ? recountResult : deposits,
        }));
        const store = createBalancesStore();
        store.dispatch(depositsApi.endpoints.getDeposits.initiate(request));
        await waitFor(() => expect(calls).toHaveLength(1));

        await store.dispatch(endpoint.initiate());

        await waitFor(() => expect(calls.filter((c) => c.method === "GET")).toHaveLength(2));
    });

    it("writes failed loads into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createBalancesStore();

        await store.dispatch(depositsApi.endpoints.getDeposits.initiate(request));
        await store.dispatch(depositsApi.endpoints.getDepositsFormLookups.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(2);
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes failed recounts into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createBalancesStore();

        await store.dispatch(depositsApi.endpoints.recountBalances.initiate());
        await store.dispatch(depositsApi.endpoints.fullRecountBalances.initiate());

        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "SomethingFailed", errorMessage: "failed" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    // the alerts keep an error code once, so the full recount is checked on its own
    it("writes a failed full recount into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createBalancesStore();

        await store.dispatch(depositsApi.endpoints.fullRecountBalances.initiate());

        expect(store.getState().alertState.alert.ApiMutation).toHaveLength(1);
    });

    it("writes nothing into the alerts when the requests succeed", async () => {
        mockFetch((call) => ({ status: 200, body: call.method === "POST" ? recountResult : deposits }));
        const store = createBalancesStore();

        await store.dispatch(depositsApi.endpoints.getDeposits.initiate(request));
        await store.dispatch(depositsApi.endpoints.recountBalances.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });
});
