//reportsTestStore.tsx

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import alertReducer from "../appcarcass/redux/slices/alertSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import navMenuReducer, { setMenuLoading, setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import userReducer, { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { reportsApi } from "../redux/api/reportsApi";
import type { IReport, IReportCatalog, IReportInfo, IReportLookups } from "../redux/types/reportsTypes";
import LocationProbe from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the reports item,
// "withoutRight" only the payments page
export function createReportsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [reportsApi.reducerPath]: reportsApi.reducer,
            alertState: alertReducer,
            appParametersState: appParametersReducer,
            navMenuState: navMenuReducer,
            userState: userReducer,
        },
        preloadedState: {
            appParametersState: { appName: "test", baseUrl: testBaseUrl },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(reportsApi.middleware),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("payments", "reports")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("payments")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type ReportsStore = ReturnType<typeof createReportsStore>;

export function renderReportsOnRoute(element: ReactElement, store: ReportsStore, url: string) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/reports" element={element} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </Provider>
    );
}

export const endDateParameter = { name: "endDate", caption: "თარიღისთვის", required: true } as const;

export function reportInfo(changes: Partial<IReportInfo> = {}): IReportInfo {
    return {
        key: "r03RoomsAgenda",
        title: "ოთახების ცხრილი",
        description: "ოთახების გაკვეთილები კვირის დღეების მიხედვით",
        parameters: [endDateParameter],
        ...changes,
    };
}

// a period report with the three lookups, like part 18's reports
export const periodReport = reportInfo({
    key: "rPeriod",
    title: "პერიოდის რეპორტი",
    description: null,
    parameters: [
        { name: "startDate", caption: "თარიღიდან", required: true },
        { name: "endDate", caption: "თარიღამდე", required: true },
        { name: "teacherId", caption: "მასწავლებელი", required: false },
        { name: "courseId", caption: "საგანი", required: false },
        { name: "studentId", caption: "მოსწავლე", required: false },
    ],
});

// "all" with three reports, "schedule" with two, "checks" with the overlap report and the period report
export const reportCatalog: IReportCatalog = {
    categories: [
        { key: "all", name: "ყველა", reportKeys: ["r03RoomsAgenda", "r06RoomOver", "rPeriod"] },
        { key: "schedule", name: "გაკვეთილების ცხრილი", reportKeys: ["r03RoomsAgenda", "r06RoomOver"] },
        { key: "checks", name: "შემოწმება", reportKeys: ["r06RoomOver", "rPeriod"] },
    ],
    reports: [
        reportInfo(),
        reportInfo({ key: "r06RoomOver", title: "ოთახების გადაფარვა", description: null }),
        periodReport,
    ],
};

// synthetic names only
export const reportLookups: IReportLookups = {
    teachers: [
        { id: 5, name: "Alpha Ann / T5" },
        { id: 6, name: "Beta Bob / T6" },
    ],
    courses: [{ id: 3, name: "Math" }],
    students: [{ id: 20, name: "Gamma Gia / 6.020" }],
};

export function roomsReport(changes: Partial<IReport> = {}): IReport {
    return {
        key: "r03RoomsAgenda",
        title: "ოთახების ცხრილი",
        parameters: [{ name: "endDate", caption: "თარიღისთვის", value: "02.10.2026" }],
        columns: [
            { name: "roomName", caption: "ოთახი", type: "text" },
            { name: "groupCode", caption: "ჯგუფი", type: "text" },
            { name: "weekDay1", caption: "1-ორ", type: "time" },
            { name: "weekDay2", caption: "2-სამ", type: "time" },
        ],
        sections: [
            {
                header: null,
                rows: [
                    ["R1", "A1", "10:00:00", null],
                    ["R2", "B1", null, "15:30:00"],
                ],
                footer: null,
            },
        ],
        footerRows: [],
        ...changes,
    };
}
