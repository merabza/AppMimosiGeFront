//lessonsApi.test.ts

import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { decodeFilterSortRequest } from "../../testUtils/studentContractsTestStore";
import { createLessonsStore, lessonData, lessonLookups } from "../../testUtils/lessonsTestStore";
import { lessonsApi } from "./lessonsApi";
import type { ILessonRequest } from "../types/lessonsTypes";

const base = `${testBaseUrl}/lessons`;

const request: ILessonRequest = {
    lessonStatusId: 2,
    substituteTeacherContractId: 5,
    teacherLateMinutes: 0,
    recoverDate: null,
    note: null,
    students: [],
};

const emptyRows = { allRowsCount: 0, offset: 0, rows: [] };

describe("lessonsApi", () => {
    it("sends the grid request encoded in the rowsdata query", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createLessonsStore();
        const filterSortRequest = {
            offset: 10,
            rowsCount: 10,
            filterFields: [{ fieldName: "grpId", value: "7" }],
            sortByFields: [{ fieldName: "lessonDt", ascending: false }],
        };

        const result = await store.dispatch(
            lessonsApi.endpoints.getLessonsRowsData.initiate(filterSortRequest)
        );

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url.startsWith(`${base}/rowsdata?`)).toBe(true);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(decodeFilterSortRequest(calls[0].url)).toEqual(filterSortRequest);
        expect(result.data).toEqual(emptyRows);
    });

    it("loads the form lookups and one lesson", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/formlookups") ? lessonLookups : lessonData(),
        }));
        const store = createLessonsStore();

        const lookups = await store.dispatch(lessonsApi.endpoints.getLessonFormLookups.initiate());
        const lesson = await store.dispatch(lessonsApi.endpoints.getLesson.initiate(9));

        expect(calls.map((c) => c.url)).toEqual([`${base}/formlookups`, `${base}/9`]);
        expect(lookups.data).toEqual(lessonLookups);
        expect(lesson.data).toEqual(lessonData());
    });

    it("saves the journal with PUT and refreshes the list", async () => {
        const calls = mockFetch(() => ({ status: 200, body: emptyRows }));
        const store = createLessonsStore();
        const list = store.dispatch(
            lessonsApi.endpoints.getLessonsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        await list;

        await store.dispatch(lessonsApi.endpoints.updateLesson.initiate({ lessonId: 9, request }));

        const put = calls.find((c) => c.method === "PUT")!;
        expect(put.url).toBe(`${base}/9`);
        expect(put.body).toEqual(request);
        await expect.poll(() => calls.filter((c) => c.url.includes("/rowsdata")).length).toBe(2);
        list.unsubscribe();
    });

    it("writes a load error to ApiLoad and a save error to ApiMutation", async () => {
        mockFetch(() => ({
            status: 400,
            body: { title: "StudentRowNotFound", detail: "not this lesson", status: 400 },
        }));
        const store = createLessonsStore();

        await store.dispatch(lessonsApi.endpoints.getLesson.initiate(9));
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(1);
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();

        await store.dispatch(lessonsApi.endpoints.updateLesson.initiate({ lessonId: 9, request }));

        expect(JSON.stringify(store.getState().alertState.alert.ApiMutation)).toContain(
            "not this lesson"
        );
    });

    // the list and the lookups report their load errors too; every failure is appended
    it("writes failed list and lookup loads into ApiLoad", async () => {
        mockFetch(() => ({
            status: 400,
            body: { title: "FilterSortRequestIsInvalid", detail: "bad filter", status: 400 },
        }));
        const store = createLessonsStore();

        await store.dispatch(
            lessonsApi.endpoints.getLessonsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(1);
        await store.dispatch(lessonsApi.endpoints.getLessonFormLookups.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toHaveLength(2);
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });
});
