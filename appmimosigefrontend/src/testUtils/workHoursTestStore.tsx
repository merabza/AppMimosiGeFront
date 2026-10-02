//workHoursTestStore.tsx

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import alertReducer from "../appcarcass/redux/slices/alertSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import navMenuReducer, {
    setMenuLoading,
    setNavMenu,
} from "../appcarcass/redux/slices/navMenuSlice";
import userReducer, { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { workHoursApi } from "../redux/api/workHoursApi";
import type {
    IWorkHour,
    IWorkHourFormLookups,
    IWorkHourRow,
    IWorkHoursRowsData,
} from "../redux/types/workHoursTypes";
import LocationProbe, { BackButton } from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the work hours item,
// "withoutRight" only the payments page
export function createWorkHoursStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [workHoursApi.reducerPath]: workHoursApi.reducer,
            alertState: alertReducer,
            appParametersState: appParametersReducer,
            navMenuState: navMenuReducer,
            userState: userReducer,
        },
        preloadedState: {
            appParametersState: { appName: "test", baseUrl: testBaseUrl },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(workHoursApi.middleware),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("payments", "workHours")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("payments")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type WorkHoursStore = ReturnType<typeof createWorkHoursStore>;

// renders the element on the given route (several entries make a history to go back in); the other page routes
// render a marker text
export function renderWorkHoursOnRoute(
    element: ReactElement,
    store: WorkHoursStore,
    path: string,
    ...urls: string[]
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={urls} initialIndex={urls.length - 1}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/workHours" element={<div>list page</div>} />
                    <Route path="/workHourEdit/:whId" element={<div>edit page</div>} />
                    <Route path="/workHourEdit" element={<div>new page</div>} />
                </Routes>
                <LocationProbe />
                <BackButton />
            </MemoryRouter>
        </Provider>
    );
}

// the employees, sorted by name as the server sends them (synthetic names)
export const workHourLookups: IWorkHourFormLookups = {
    employees: [
        { id: 1, name: "Alpha Ann / T3.01" },
        { id: 15, name: "Alpha Ann / T3.10" },
        { id: 5, name: "Beta Bob / T3.05" },
    ],
};

// a finished record of employee 1
export function workHourData(changes: Partial<IWorkHour> = {}): IWorkHour {
    return {
        id: 7,
        teacherContractId: 1,
        employeeName: "Alpha Ann / T3.01",
        whStart: "2026-09-15T11:55:12",
        whEnd: "2026-09-15T18:05:00",
        ...changes,
    };
}

export function workHourRow(changes: Partial<IWorkHourRow> = {}): IWorkHourRow {
    return {
        id: 7,
        teacherContractId: 1,
        employeeName: "Alpha Ann / T3.01",
        whStart: "2026-09-15T11:55:12",
        whEnd: "2026-09-15T18:05:00",
        hours: 6.16,
        ...changes,
    };
}

export function workHoursRows(rows: IWorkHourRow[] = [workHourRow()]): IWorkHoursRowsData {
    return {
        allRowsCount: rows.length,
        offset: 0,
        rows,
        totals: [{ teacherContractId: 1, employeeName: "Alpha Ann / T3.01", hours: 6.16, recordsCount: rows.length }],
    };
}
