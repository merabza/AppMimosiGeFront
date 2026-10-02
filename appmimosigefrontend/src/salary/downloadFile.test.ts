//downloadFile.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { captureDownloads } from "../testUtils/salaryTestStore";
import { fileNameFromDisposition, fileResponseHandler, saveBlob } from "./downloadFile";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("downloadFile", () => {
    it.each([
        [null, "fallback.csv"],
        ["", "fallback.csv"],
        ["attachment", "fallback.csv"],
        ["attachment; filename=salary_2026_10_5.csv", "salary_2026_10_5.csv"],
        ['attachment; filename="salary_2026_10_5.csv"', "salary_2026_10_5.csv"],
        ["attachment; filename=a.csv; filename*=UTF-8''%E1%83%90.csv", "ა.csv"],
        ["attachment; filename=salary.csv ; size=1", "salary.csv"],
        ["attachment; filename*=UTF-8''a%20b.csv ; size=1", "a b.csv"],
    ])("the name of '%s' is %s", (disposition, expected) => {
        expect(fileNameFromDisposition(disposition, "fallback.csv")).toBe(expected);
    });

    it("saves the blob through a temporary link", () => {
        const saved = captureDownloads();
        const blob = new Blob(["x"]);

        saveBlob(blob, "a.csv");

        expect(saved).toEqual([{ fileName: "a.csv", blob, attached: true }]);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0");
        expect(document.querySelectorAll("a")).toHaveLength(0);
    });

    it("saves a successful response under its own name and returns the name", async () => {
        const saved = captureDownloads();
        const response = new Response("﻿DOCNUM", {
            status: 200,
            headers: { "Content-Disposition": "attachment; filename=salary_2026_10_4.csv" },
        });

        const result = await fileResponseHandler("fallback.csv")(response);

        expect(result).toBe("salary_2026_10_4.csv");
        expect(saved.map((s) => s.fileName)).toEqual(["salary_2026_10_4.csv"]);
        expect(new Uint8Array(await saved[0].blob.arrayBuffer())).toEqual(
            new Uint8Array([0xef, 0xbb, 0xbf, 0x44, 0x4f, 0x43, 0x4e, 0x55, 0x4d])
        );
    });

    it("uses the fallback name when the header is not readable", async () => {
        const saved = captureDownloads();

        const result = await fileResponseHandler("fallback.csv")(new Response("a", { status: 200 }));

        expect(result).toBe("fallback.csv");
        expect(saved.map((s) => s.fileName)).toEqual(["fallback.csv"]);
    });

    it("returns the problem of an error response without saving", async () => {
        const saved = captureDownloads();
        const problem = { title: "SalaryHeaderNotFound", status: 404 };

        const result = await fileResponseHandler("f.csv")(new Response(JSON.stringify(problem), { status: 404 }));
        const text = await fileResponseHandler("f.csv")(new Response("forbidden", { status: 403 }));

        expect(result).toEqual(problem);
        expect(text).toBe("forbidden");
        expect(saved).toEqual([]);
    });
});
