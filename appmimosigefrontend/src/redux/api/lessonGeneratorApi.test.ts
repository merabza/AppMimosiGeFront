//lessonGeneratorApi.test.ts

import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../../testUtils/testStore";
import { createGroupsStore } from "../../testUtils/groupsTestStore";
import { changedGroup, generation } from "../../testUtils/lessonGeneratorTestData";
import { groupsApi } from "./groupsApi";
import { lessonGeneratorApi } from "./lessonGeneratorApi";

const base = `${testBaseUrl}/lessongenerator`;

const serverError = {
    status: 404,
    body: { title: "GroupNotFound", detail: "ჯგუფი ვერ მოიძებნა", status: 404 },
};

const generated = generation([changedGroup]);

describe("lessonGeneratorApi", () => {
    it.each([
        ["generateGroupLessons", 7, `${base}/groups/7`],
        ["generateGroupLastLesson", 7, `${base}/groups/7/lastlesson`],
        ["generateDirtyGroupsLessons", undefined, `${base}/dirtygroups`],
        ["generateAllGroupsLessons", undefined, `${base}/allgroups`],
    ] as const)("%s posts to the generator", async (endpoint, argument, url) => {
        const calls = mockFetch(() => ({ status: 200, body: generated }));
        const store = createGroupsStore();

        const result = await store.dispatch(
            //each endpoint takes the group id or nothing
            (lessonGeneratorApi.endpoints[endpoint].initiate as (arg: number | undefined) => never)(argument)
        );

        expect(calls[0].method).toBe("POST");
        expect(calls[0].url).toBe(url);
        expect(calls[0].authorization).toBe("Bearer token");
        expect((result as { data: unknown }).data).toEqual(generated);
    });

    // the generator changes DirtyLessons: the groups list and the open group reload
    it("reloads the groups after a generation", async () => {
        const calls = mockFetch((call) =>
            call.method === "POST"
                ? { status: 200, body: generated }
                : { status: 200, body: { allRowsCount: 0, offset: 0, rows: [] } }
        );
        const store = createGroupsStore();
        store.dispatch(
            groupsApi.endpoints.getGroupsRowsData.initiate({
                offset: 0,
                rowsCount: 10,
                filterFields: [],
                sortByFields: [],
            })
        );
        await waitFor(() => expect(calls).toHaveLength(1));

        await store.dispatch(lessonGeneratorApi.endpoints.generateDirtyGroupsLessons.initiate());

        await waitFor(() => expect(calls.filter((c) => c.url.includes("/groups/rowsdata"))).toHaveLength(2));
    });

    it("writes a generation error to the mutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createGroupsStore();

        await store.dispatch(lessonGeneratorApi.endpoints.generateGroupLessons.initiate(99));

        await waitFor(() => expect(store.getState().alertState.alert.ApiMutation).toHaveLength(1));
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it.each([
        [undefined, `${base}/log`],
        [7, `${base}/log?grpId=7`],
    ])("loads the log of group %s", async (grpId, url) => {
        const rows = [
            {
                id: 1,
                createdDate: "2026-10-01T09:30:00",
                grpId: 7,
                groupCode: "1001",
                errorCode: 6,
                errorText: "text",
                lessonDate: "2026-09-21T00:00:00",
                lessonId: null,
            },
        ];
        const calls = mockFetch(() => ({ status: 200, body: rows }));
        const store = createGroupsStore();

        const result = await store.dispatch(lessonGeneratorApi.endpoints.getLessonGeneratorLog.initiate(grpId));

        expect(calls[0].method).toBe("GET");
        expect(calls[0].url).toBe(url);
        expect(result.data).toEqual(rows);
    });

    it("writes a log load error to the load alerts", async () => {
        mockFetch(() => serverError);
        const store = createGroupsStore();

        await store.dispatch(lessonGeneratorApi.endpoints.getLessonGeneratorLog.initiate(undefined));

        await waitFor(() => expect(store.getState().alertState.alert.ApiLoad).toHaveLength(1));
    });

    // a generation changes the log: an open log reloads
    it("reloads the log after a generation", async () => {
        const calls = mockFetch((call) =>
            call.method === "POST" ? { status: 200, body: generated } : { status: 200, body: [] }
        );
        const store = createGroupsStore();
        store.dispatch(lessonGeneratorApi.endpoints.getLessonGeneratorLog.initiate(undefined));
        await waitFor(() => expect(calls).toHaveLength(1));

        await store.dispatch(lessonGeneratorApi.endpoints.generateGroupLessons.initiate(7));

        await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/log"))).toHaveLength(2));
    });
});
