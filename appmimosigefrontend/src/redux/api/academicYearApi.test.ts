//academicYearApi.test.ts

import { describe, expect, it } from "vitest";
import {
    academicYears,
    closeResult,
    createAcademicYearStore,
    wizardInfo,
} from "../../testUtils/academicYearTestStore";
import { mockFetch, testBaseUrl, type FetchCall } from "../../testUtils/testStore";
import { academicYearApi, closeGroupsUrl } from "./academicYearApi";

const serverError = {
    status: 409,
    body: { title: "AcademicYearAlreadyExists", detail: "exists", status: 409 },
};

const urls = (calls: FetchCall[]) => calls.map((c) => [c.method, c.url]);

describe("closeGroupsUrl", () => {
    it("puts the year in the path and the date and the dry run in the query", () => {
        expect(closeGroupsUrl({ ayId: 11, closeDate: "2027-09-01", dryRun: true })).toBe(
            "/academicyear/11/closegroups?closeDate=2027-09-01&dryRun=true"
        );
        expect(closeGroupsUrl({ ayId: 9, closeDate: "2026-07-01", dryRun: false })).toBe(
            "/academicyear/9/closegroups?closeDate=2026-07-01&dryRun=false"
        );
    });
});

describe("academicYearApi", () => {
    it("loads the years of the global selector and the wizard's information", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.endsWith("/info") ? wizardInfo : academicYears,
        }));
        const store = createAcademicYearStore();

        const years = await store.dispatch(academicYearApi.endpoints.getAcademicYears.initiate());
        const info = await store.dispatch(academicYearApi.endpoints.getAcademicYearWizardInfo.initiate());

        expect(urls(calls)).toEqual([
            ["GET", `${testBaseUrl}/academicyears`],
            ["GET", `${testBaseUrl}/academicyear/info`],
        ]);
        expect(calls[0].authorization).toBe("Bearer token");
        expect(years.data).toEqual(academicYears);
        expect(info.data).toEqual(wizardInfo);
    });

    it("posts the steps with their dry run", async () => {
        const calls = mockFetch((call) => ({
            status: 200,
            body: call.url.includes("/create") ? {} : closeResult(true, []),
        }));
        const store = createAcademicYearStore();

        await store.dispatch(academicYearApi.endpoints.createAcademicYear.initiate(true));
        await store.dispatch(
            academicYearApi.endpoints.closeAcademicYearGroups.initiate({
                ayId: 11,
                closeDate: "2027-09-01",
                dryRun: true,
            })
        );

        expect(urls(calls)).toEqual([
            ["POST", `${testBaseUrl}/academicyear/create?dryRun=true`],
            ["POST", `${testBaseUrl}/academicyear/11/closegroups?closeDate=2027-09-01&dryRun=true`],
        ]);
    });

    // a preview changes nothing, so the years are not loaded again; an executed step changes them
    it("loads the years again only after an executed step", async () => {
        const calls = mockFetch((call) => {
            if (call.url.endsWith("/academicyears")) return { status: 200, body: academicYears };
            if (call.url.endsWith("/info")) return { status: 200, body: wizardInfo };
            return { status: 200, body: call.url.includes("/create") ? {} : closeResult(false, []) };
        });
        const store = createAcademicYearStore();
        store.dispatch(academicYearApi.endpoints.getAcademicYears.initiate());
        store.dispatch(academicYearApi.endpoints.getAcademicYearWizardInfo.initiate());
        await Promise.all(store.dispatch(academicYearApi.util.getRunningQueriesThunk()));
        const loads = () => calls.filter((c) => c.method === "GET").length;

        await store.dispatch(academicYearApi.endpoints.createAcademicYear.initiate(true));
        await store.dispatch(
            academicYearApi.endpoints.closeAcademicYearGroups.initiate({ ayId: 11, closeDate: "2027-09-01", dryRun: true })
        );
        await Promise.all(store.dispatch(academicYearApi.util.getRunningQueriesThunk()));
        expect(loads()).toBe(2);

        await store.dispatch(academicYearApi.endpoints.createAcademicYear.initiate(false));
        await Promise.all(store.dispatch(academicYearApi.util.getRunningQueriesThunk()));
        expect(loads()).toBe(4);

        await store.dispatch(
            academicYearApi.endpoints.closeAcademicYearGroups.initiate({ ayId: 11, closeDate: "2027-09-01", dryRun: false })
        );
        await Promise.all(store.dispatch(academicYearApi.util.getRunningQueriesThunk()));
        expect(loads()).toBe(6);
    });

    it("writes a failed wizard load into the ApiLoad alerts", async () => {
        mockFetch(() => serverError);
        const store = createAcademicYearStore();

        await store.dispatch(academicYearApi.endpoints.getAcademicYearWizardInfo.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toEqual([
            { errorCode: "AcademicYearAlreadyExists", errorMessage: "exists" },
        ]);
    });

    // the global selector is on every page: its failure is no alert
    it("writes no alert when the years of the selector fail", async () => {
        mockFetch(() => serverError);
        const store = createAcademicYearStore();

        await store.dispatch(academicYearApi.endpoints.getAcademicYears.initiate());

        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
        expect(store.getState().alertState.alert.ApiMutation).toBeUndefined();
    });

    it("writes failed steps into the ApiMutation alerts", async () => {
        mockFetch(() => serverError);
        const store = createAcademicYearStore();

        await store.dispatch(academicYearApi.endpoints.createAcademicYear.initiate(false));
        await store.dispatch(
            academicYearApi.endpoints.closeAcademicYearGroups.initiate({ ayId: 11, closeDate: "2027-09-01", dryRun: false })
        );

        // the same error code is kept once
        expect(store.getState().alertState.alert.ApiMutation).toEqual([
            { errorCode: "AcademicYearAlreadyExists", errorMessage: "exists" },
        ]);
        expect(store.getState().alertState.alert.ApiLoad).toBeUndefined();
    });

    it("is registered in the store under its own key", () => {
        expect(academicYearApi.reducerPath).toBe("academicYearApi");
        expect(Object.keys(createAcademicYearStore().getState())).toContain("academicYearApi");
    });
});
