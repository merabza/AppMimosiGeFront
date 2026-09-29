//filterSortRequestEncoding.test.ts

import { describe, expect, it } from "vitest";
import { encodeFilterSortRequest } from "./filterSortRequestEncoding";

//the same steps the backend FilterSortRequestFactory takes
function decodeLikeBackend(queryValue: string): unknown {
    const base64 = decodeURIComponent(queryValue);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(decodeURIComponent(text));
}

describe("encodeFilterSortRequest", () => {
    it("round-trips a request with Georgian search text", () => {
        const request = {
            offset: 10,
            rowsCount: 10,
            filterFields: [
                { fieldName: "search", value: "ბერიძე ნინო" },
                { fieldName: "academicYearId", value: "11" },
            ],
            sortByFields: [{ fieldName: "contractDate", ascending: false }],
        };

        expect(decodeLikeBackend(encodeFilterSortRequest(request))).toEqual(
            request
        );
    });

    it("produces a value that is safe inside a query string", () => {
        const encoded = encodeFilterSortRequest({
            offset: 0,
            rowsCount: 10,
            filterFields: [{ fieldName: "search", value: "???>>>" }],
            sortByFields: [],
        });

        expect(encoded).toMatch(/^[A-Za-z0-9%]*$/);
    });
});
