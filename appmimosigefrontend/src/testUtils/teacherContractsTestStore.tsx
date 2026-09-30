//teacherContractsTestStore.tsx

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
import { teacherContractsApi } from "../redux/api/teacherContractsApi";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state;
// "withRight" has the teacher contracts item but not the student contracts one
export function createTeacherContractsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [teacherContractsApi.reducerPath]: teacherContractsApi.reducer,
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
                teacherContractsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token" } as IAppUser));
    if (menu === "withRight")
        store.dispatch(setNavMenu(mainMenu("Humans", "teacherContracts")));
    if (menu === "withoutRight")
        store.dispatch(setNavMenu(mainMenu("Humans", "studentContracts")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type TeacherContractsStore = ReturnType<typeof createTeacherContractsStore>;

// renders the element on the given route; the other page routes render a marker text
export function renderTeacherOnRoute(
    element: ReactElement,
    store: TeacherContractsStore,
    path: string,
    url: string
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route
                        path="/teacherContracts"
                        element={<div>list page</div>}
                    />
                    <Route
                        path="/teacherContractEdit/:id"
                        element={<div>edit page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
