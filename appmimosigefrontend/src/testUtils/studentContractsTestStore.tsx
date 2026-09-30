//studentContractsTestStore.tsx

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
import type { IMainMenuModel } from "../appcarcass/redux/types/userRightsTypes";
import { studentContractsApi } from "../redux/api/studentContractsApi";
import { testBaseUrl } from "./testStore";

// a main menu with the given menu keys (menLinkKey = menKey), as userrights/getmainmenu returns it
export function mainMenu(...menKeys: string[]): IMainMenuModel {
    return {
        menuGroups: [
            {
                mengId: 1,
                mengKey: "HumansAndContracts",
                mengName: "HumansAndContracts",
                sortId: 0,
                mengIconName: null,
                hidden: false,
                expanded: true,
                menu: menKeys.map((menKey, index) => ({
                    menId: index + 1,
                    menKey,
                    menName: `menu ${menKey}`,
                    menValue: null,
                    menGroupId: 1,
                    sortId: index,
                    menLinkKey: menKey,
                    menIconName: null,
                    create: true,
                    update: true,
                    delete: true,
                    confirm: false,
                })),
            },
        ],
    };
}

export type MenuState = "withRight" | "withoutRight" | "loading" | "notLoaded";

// a store with a logged-in user and the main menu in the requested state
export function createStudentContractsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [studentContractsApi.reducerPath]: studentContractsApi.reducer,
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
                studentContractsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token" } as IAppUser));
    if (menu === "withRight")
        store.dispatch(setNavMenu(mainMenu("Humans", "studentContracts")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("Humans")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type StudentContractsStore = ReturnType<typeof createStudentContractsStore>;

// renders the element on the given route; the other page routes render a marker text
export function renderOnRoute(
    element: ReactElement,
    store: StudentContractsStore,
    path: string,
    url: string
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route
                        path="/studentContracts"
                        element={<div>list page</div>}
                    />
                    <Route
                        path="/studentContractEdit/:scId"
                        element={<div>edit page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

// the filterSortRequest query value back as the backend reads it (base64 -> URL-decode -> JSON)
export function decodeFilterSortRequest(url: string): {
    offset: number;
    rowsCount: number;
    filterFields: { fieldName: string; value: string }[];
    sortByFields: { fieldName: string; ascending: boolean }[];
} {
    const value = new URL(url).searchParams.get("filterSortRequest") ?? "";
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return JSON.parse(decodeURIComponent(new TextDecoder().decode(bytes)));
}
