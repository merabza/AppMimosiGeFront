//groupsTestStore.tsx

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
import { groupsApi } from "../redux/api/groupsApi";
import { lessonGeneratorApi } from "../redux/api/lessonGeneratorApi";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user (with the given special rights) and the main menu in the requested state;
// "withRight" has the groups item, "withoutRight" only the contract pages
export function createGroupsStore(
    menu: MenuState = "withRight",
    appClaims?: string[]
) {
    const store = configureStore({
        reducer: {
            [groupsApi.reducerPath]: groupsApi.reducer,
            [lessonGeneratorApi.reducerPath]: lessonGeneratorApi.reducer,
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
                groupsApi.middleware,
                lessonGeneratorApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token", appClaims } as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("groups")));
    if (menu === "withoutRight")
        store.dispatch(
            setNavMenu(mainMenu("studentContracts", "teacherContracts"))
        );
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type GroupsStore = ReturnType<typeof createGroupsStore>;

// renders the element on the given route; the other page routes render a marker text
export function renderGroupsOnRoute(
    element: ReactElement,
    store: GroupsStore,
    path: string,
    url: string
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/groups" element={<div>list page</div>} />
                    <Route
                        path="/groupEdit/:grpId"
                        element={<div>edit page</div>}
                    />
                    <Route
                        path="/lessonGeneratorLog"
                        element={<div>log page</div>}
                    />
                    <Route
                        path="/lessonEdit/:lessonId"
                        element={<div>lesson page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
