//crmCallsTestStore.tsx

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
import { crmCallsApi } from "../redux/api/crmCallsApi";
import type {
    ICrmCall,
    ICrmCallFormLookups,
    ICrmCallRow,
} from "../redux/types/crmCallsTypes";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import LocationProbe, { BackButton } from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the CRM calls item,
// "withoutRight" only the deposits page
export function createCrmCallsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [crmCallsApi.reducerPath]: crmCallsApi.reducer,
            alertState: alertReducer,
            appParametersState: appParametersReducer,
            navMenuState: navMenuReducer,
            userState: userReducer,
        },
        preloadedState: {
            appParametersState: { appName: "test", baseUrl: testBaseUrl },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(
                crmCallsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("deposits", "crmCalls")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("deposits")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type CrmCallsStore = ReturnType<typeof createCrmCallsStore>;

// renders the element on the given route (several entries make a history to go back in); the other page routes
// render a marker text
export function renderCrmCallsOnRoute(
    element: ReactElement,
    store: CrmCallsStore,
    path: string,
    ...urls: string[]
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={urls} initialIndex={urls.length - 1}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/crmCalls" element={<div>list page</div>} />
                    <Route path="/crmCallEdit/:crmCallId" element={<div>edit page</div>} />
                    <Route path="/crmCallEdit" element={<div>new page</div>} />
                </Routes>
                <LocationProbe />
                <BackButton />
            </MemoryRouter>
        </Provider>
    );
}

export const crmCallLookups: ICrmCallFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    callTypes: [
        { id: 2, name: "Another" },
        { id: 1, name: "Reminder" },
    ],
    answerTypes: [
        { id: 3, name: "Answered" },
        { id: 2, name: "No answer" },
        { id: 1, name: "Off" },
    ],
};

// the contracts of each year (synthetic names)
export const crmYearContracts: Record<number, ILookupItem[]> = {
    10: [{ id: 12, name: "Gamma Gia / 6.001" }],
    11: [
        { id: 10, name: "Alpha Ann / 6.001" },
        { id: 11, name: "Beta Bob / 6.002" },
    ],
};

// a call to contract 10 (2026-2027)
export function crmCallData(changes: Partial<ICrmCall> = {}): ICrmCall {
    return {
        id: 5,
        studentContractId: 10,
        studentContractName: "Alpha Ann / 6.001",
        academicYearId: 11,
        callTypeId: 1,
        callDate: "2026-09-24T19:48:29",
        answerTypeId: 3,
        callConversation: "will pay next week",
        mustPayDate: "2026-10-08T00:00:00",
        ...changes,
    };
}

export function crmCallRow(changes: Partial<ICrmCallRow> = {}): ICrmCallRow {
    return {
        id: 5,
        studentContractId: 10,
        studentName: "Alpha Ann / 6.001",
        callDate: "2026-09-24T19:48:29",
        callTypeId: 1,
        callTypeName: "Reminder",
        answerTypeId: 3,
        answerTypeName: "Answered",
        callConversation: "will pay next week",
        mustPayDate: "2026-10-08T00:00:00",
        ...changes,
    };
}
