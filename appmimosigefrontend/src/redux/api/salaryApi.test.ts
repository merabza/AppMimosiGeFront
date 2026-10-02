//salaryApi.test.ts

import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import {
    captureDownloads,
    createSalaryStore,
    mockFetchFiles,
    salaryHeaderData,
    salaryHeaderRow,
    salaryLookups,
    type SalaryStore,
} from "../../testUtils/salaryTestStore";
import { salaryApi } from "./salaryApi";

const base = `${testBaseUrl}/salary`;

const headerRequest = { shChargeDate: "2026-10-05", shTransferDate: "2026-10-04" };
const partRequest = { teacherContractId: 5, salaryPartTypeId: 4, spAmount: 10 };

const serverError = {
    status: 409,
    body: { title: "PartIsCalculated", detail: "calculated", status: 409 },
};

afterEach(() => {
    vi.restoreAllMocks();
});

// every change, as the pages run it, with the request it sends
const changes: [string, (store: SalaryStore) => unknown, string, string, unknown][] = [
    [
        "create header",
        (store) => store.dispatch(salaryApi.endpoints.createSalaryHeader.initiate(headerRequest)),
        "POST",
        base,
        headerRequest,
    ],
    [
        "update header",
        (store) => store.dispatch(salaryApi.endpoints.updateSalaryHeader.initiate({ shId: 2, request: headerRequest })),
        "PUT",
        `${base}/2`,
        headerRequest,
    ],
    [
        "delete header",
        (store) => store.dispatch(salaryApi.endpoints.deleteSalaryHeader.initiate(2)),
        "DELETE",
        `${base}/2`,
        undefined,
    ],
    [
        "create part",
        (store) => store.dispatch(salaryApi.endpoints.createSalaryPart.initiate({ shId: 2, request: partRequest })),
        "POST",
        `${base}/2/parts`,
        partRequest,
    ],
    [
        "update part",
        (store) => store.dispatch(salaryApi.endpoints.updateSalaryPart.initiate({ spId: 21, request: partRequest })),
        "PUT",
        `${base}/parts/21`,
        partRequest,
    ],
    [
        "delete part",
        (store) => store.dispatch(salaryApi.endpoints.deleteSalaryPart.initiate(21)),
        "DELETE",
        `${base}/parts/21`,
        undefined,
    ],
    [
        "count",
        (store) => store.dispatch(salaryApi.endpoints.countSalary.initiate(2)),
        "POST",
        `${base}/2/count`,
        undefined,
    ],
];

describe("salaryApi", () => {
    it("loads the headers with the token", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [salaryHeaderRow()] }));
        const store = createSalaryStore();

        const result = await store.dispatch(salaryApi.endpoints.getSalaryHeaders.initiate());

        expect(calls[0]).toMatchObject({ method: "GET", url: `${base}/headers`, authorization: "Bearer token" });
        expect(result.data).toEqual([salaryHeaderRow()]);
    });

    it("loads the form lookups and one header", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/formlookups") ? salaryLookups : salaryHeaderData(),
        }));
        const store = createSalaryStore();

        const lookups = await store.dispatch(salaryApi.endpoints.getSalaryFormLookups.initiate());
        const header = await store.dispatch(salaryApi.endpoints.getSalaryHeader.initiate(2));

        expect(calls.map((c) => c.url)).toEqual([`${base}/formlookups`, `${base}/2`]);
        expect(lookups.data).toEqual(salaryLookups);
        expect(header.data).toEqual(salaryHeaderData());
    });

    it.each(changes)("%s sends its request", async (_, run, method, url, body) => {
        const calls = mockFetch(() => ({ status: 200, body: 4 }));
        const store = createSalaryStore();

        await run(store);

        expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([[method, url, body]]);
    });

    it.each(changes)("%s writes a server error to the mutation alert", async (_, run) => {
        mockFetch(() => serverError);
        const store = createSalaryStore();

        await run(store);

        await waitFor(() => expect(store.getState().alertState.alert.ApiMutation).toHaveLength(1));
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("writes a load error to the load alert", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Error", status: 500 } }));
        const store = createSalaryStore();

        await store.dispatch(salaryApi.endpoints.getSalaryHeaders.initiate());
        await store.dispatch(salaryApi.endpoints.getSalaryFormLookups.initiate());
        await store.dispatch(salaryApi.endpoints.getSalaryHeader.initiate(2));

        await waitFor(() => expect(store.getState().alertState.alert.ApiLoad).toHaveLength(3));
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    // a change of the header list reloads the list, a change inside the header reloads the header
    it("count reloads the headers and the header", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/headers") ? [salaryHeaderRow()] : call.method === "GET" ? salaryHeaderData() : {},
        }));
        const store = createSalaryStore();
        const headers = store.dispatch(salaryApi.endpoints.getSalaryHeaders.initiate());
        const header = store.dispatch(salaryApi.endpoints.getSalaryHeader.initiate(2));
        await headers;
        await header;

        await store.dispatch(salaryApi.endpoints.countSalary.initiate(2));

        await waitFor(() => expect(calls.filter((c) => c.method === "GET")).toHaveLength(4));
        headers.unsubscribe();
        header.unsubscribe();
    });

    it("a part change reloads only the header", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/headers") ? [salaryHeaderRow()] : call.method === "GET" ? salaryHeaderData() : 9,
        }));
        const store = createSalaryStore();
        const headers = store.dispatch(salaryApi.endpoints.getSalaryHeaders.initiate());
        const header = store.dispatch(salaryApi.endpoints.getSalaryHeader.initiate(2));
        await headers;
        await header;

        await store.dispatch(salaryApi.endpoints.createSalaryPart.initiate({ shId: 2, request: partRequest }));

        await waitFor(() => expect(calls.filter((c) => c.url === `${base}/2`)).toHaveLength(2));
        //ახალი მოთხოვნა, თუ მოხდება, დაყოვნებული იქნებოდა: მომდევნო ჩატვირთვას ვუცდით
        await store.dispatch(salaryApi.endpoints.getSalaryFormLookups.initiate());
        expect(calls.filter((c) => c.url === `${base}/headers`)).toHaveLength(1);
        headers.unsubscribe();
        header.unsubscribe();
    });

    it("downloads the transfer file and returns its name", async () => {
        const saved = captureDownloads();
        const calls = mockFetchFiles(() => ({
            status: 200,
            text: "DOCNUM",
            headers: { "Content-Disposition": "attachment; filename=salary_2026_10_4.csv" },
        }));
        const store = createSalaryStore();

        const result = await store.dispatch(
            salaryApi.endpoints.downloadTransferFile.initiate({ shId: 2, transferDate: "2026-10-04T00:00:00" })
        );

        expect(calls.map((c) => [c.method, c.url, c.authorization])).toEqual([
            ["GET", `${base}/2/transferfile`, "Bearer token"],
        ]);
        expect(result).toEqual({ data: "salary_2026_10_4.csv" });
        expect(saved.map((s) => s.fileName)).toEqual(["salary_2026_10_4.csv"]);
    });

    // another origin (the dev server) does not expose Content-Disposition: the name is built like the server's
    it("downloads the declaration file of the month under the built name", async () => {
        const saved = captureDownloads();
        const calls = mockFetchFiles(() => ({ status: 200, text: "x" }));
        const store = createSalaryStore();

        const result = await store.dispatch(salaryApi.endpoints.downloadDeclarationFile.initiate("2026-09"));

        expect(calls.map((c) => c.url)).toEqual([`${base}/declarationfile?month=2026-09-01`]);
        expect(result).toEqual({ data: "TaxDepDeclaration_2026_9.csv" });
        expect(saved.map((s) => s.fileName)).toEqual(["TaxDepDeclaration_2026_9.csv"]);
    });

    it("a failed download saves nothing and writes the mutation alert", async () => {
        const saved = captureDownloads();
        mockFetchFiles(() => ({
            status: 404,
            text: JSON.stringify({ title: "SalaryHeaderNotFound", detail: "not found", status: 404 }),
        }));
        const store = createSalaryStore();

        const result = await store.dispatch(
            salaryApi.endpoints.downloadTransferFile.initiate({ shId: 9, transferDate: "2026-10-04" })
        );

        expect("error" in result).toBe(true);
        expect(saved).toEqual([]);
        await waitFor(() => expect(store.getState().alertState.alert.ApiMutation).toHaveLength(1));
    });
});
