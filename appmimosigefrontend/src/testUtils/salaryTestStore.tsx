//salaryTestStore.tsx

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import alertReducer from "../appcarcass/redux/slices/alertSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import navMenuReducer, {
    setMenuLoading,
    setNavMenu,
} from "../appcarcass/redux/slices/navMenuSlice";
import userReducer, { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { salaryApi } from "../redux/api/salaryApi";
import type {
    ISalaryFormLookups,
    ISalaryHeader,
    ISalaryHeaderRow,
    ISalaryLine,
    ISalaryPart,
} from "../redux/types/salaryTypes";
import LocationProbe, { BackButton } from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl, type FetchCall } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the salary item,
// "withoutRight" only the payments page
export function createSalaryStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [salaryApi.reducerPath]: salaryApi.reducer,
            alertState: alertReducer,
            appParametersState: appParametersReducer,
            navMenuState: navMenuReducer,
            userState: userReducer,
        },
        preloadedState: {
            appParametersState: { appName: "test", baseUrl: testBaseUrl },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(salaryApi.middleware),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("payments", "salary")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("payments")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type SalaryStore = ReturnType<typeof createSalaryStore>;

// renders the element on the given route (several entries make a history to go back in); the other page routes
// render a marker text
export function renderSalaryOnRoute(element: ReactElement, store: SalaryStore, path: string, ...urls: string[]) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={urls} initialIndex={urls.length - 1}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/salary" element={<div>list page</div>} />
                    <Route path="/salaryEdit/:shId" element={<div>edit page</div>} />
                    <Route path="/salaryEdit" element={<div>new page</div>} />
                </Routes>
                <LocationProbe />
                <BackButton />
            </MemoryRouter>
        </Provider>
    );
}

export interface FileReply {
    status: number;
    text: string;
    headers?: Record<string, string>;
}

// like mockFetch, but a reply may be a file (any text with its own headers) instead of JSON
export function mockFetchFiles(reply: (call: FetchCall) => FileReply | Promise<FileReply>): FetchCall[] {
    const calls: FetchCall[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const text = await request.text();
            const call: FetchCall = {
                method: request.method,
                url: request.url,
                body: text ? JSON.parse(text) : undefined,
                authorization: request.headers.get("authorization"),
            };
            calls.push(call);
            const answer = await reply(call);
            return new Response(answer.text, { status: answer.status, headers: answer.headers });
        })
    );
    return calls;
}

// URL.createObjectURL and the click on the download link (jsdom has neither): the saved files' names and contents,
// and whether the link was in the document when clicked (some browsers ignore a detached link).
// The test file restores the click with vi.restoreAllMocks
export function captureDownloads() {
    const saved: { fileName: string; blob: Blob; attached: boolean }[] = [];
    const blobs = new Map<string, Blob>();
    URL.createObjectURL = vi.fn((blob: Blob) => {
        const url = `blob:test/${blobs.size}`;
        blobs.set(url, blob);
        return url;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        saved.push({
            fileName: this.download,
            blob: blobs.get(this.getAttribute("href") ?? "")!,
            attached: this.isConnected,
        });
    });
    return saved;
}

// the employees, sorted by name as the server sends them, and the part types (synthetic names)
export const salaryLookups: ISalaryFormLookups = {
    employees: [
        { id: 1, name: "Alpha Ann / T3.01" },
        { id: 5, name: "Beta Bob / T3.05" },
    ],
    partTypes: [
        { id: 1, name: "ხელფასი ჩატარებული გაკვეთილების მიხედვით", countPlaceId: 1 },
        { id: 3, name: "დანამატი", countPlaceId: 1 },
        { id: 4, name: "გამოქვითვა", countPlaceId: 2 },
        { id: 6, name: "დივიდენდი", countPlaceId: null },
    ],
};

export function salaryHeaderRow(changes: Partial<ISalaryHeaderRow> = {}): ISalaryHeaderRow {
    return {
        shId: 2,
        shChargeDate: "2026-10-05T00:00:00",
        shTransferDate: "2026-10-04T00:00:00",
        linesCount: 2,
        amountNetSum: 3771.44,
        ...changes,
    };
}

export function salaryPart(changes: Partial<ISalaryPart> = {}): ISalaryPart {
    return {
        spId: 21,
        teacherContractId: 5,
        employeeName: "Beta Bob / T3.05",
        salaryPartTypeId: 3,
        salaryPartTypeName: "დანამატი",
        spAmount: 800,
        ...changes,
    };
}

export function salaryLine(changes: Partial<ISalaryLine> = {}): ISalaryLine {
    return {
        saId: 30,
        teacherContractId: 1,
        employeeName: "Alpha Ann / T3.01",
        saNetAmountRound: 100,
        saAmountGross: 125,
        saPension2: 2.5,
        saGrossMinusPension: 122.5,
        saIncomeTax: 24.5,
        saGamokvitva: 10,
        saPension4: 5,
        saAmountNet: 88,
        saMonthDate: "2026-09-01T00:00:00",
        rsQuoteTypeId: 1,
        saIndividualIncomeTax: 0,
        ...changes,
    };
}

// header 2 with a calculated part (type 1) of employee 1 and a manual part of employee 5, two lines and a detail
export function salaryHeaderData(changes: Partial<ISalaryHeader> = {}): ISalaryHeader {
    return {
        shId: 2,
        shChargeDate: "2026-10-05T00:00:00",
        shTransferDate: "2026-10-04T00:00:00",
        parts: [
            salaryPart({
                spId: 20,
                teacherContractId: 1,
                employeeName: "Alpha Ann / T3.01",
                salaryPartTypeId: 1,
                salaryPartTypeName: "ხელფასი ჩატარებული გაკვეთილების მიხედვით",
                spAmount: 99.5,
            }),
            salaryPart(),
        ],
        lines: [
            salaryLine(),
            salaryLine({
                saId: 31,
                teacherContractId: 5,
                employeeName: "Beta Bob / T3.05",
                saNetAmountRound: 800,
                saAmountGross: 1000,
                saPension2: 0,
                saGrossMinusPension: 1000,
                saIncomeTax: 200,
                saGamokvitva: 0,
                saPension4: 0,
                saAmountNet: 800,
            }),
        ],
        details: [
            {
                sadId: 40,
                saId: 30,
                employeeName: "Alpha Ann / T3.01",
                groupId: 100,
                groupCode: "G-100",
                sadHoursCount: 12.5,
                sadAmount: 99.5,
                sadHourCost: 7.96,
            },
        ],
        ...changes,
    };
}
