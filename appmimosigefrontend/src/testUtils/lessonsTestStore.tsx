//lessonsTestStore.tsx

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
import { lessonsApi } from "../redux/api/lessonsApi";
import type { ILesson, ILessonFormLookups } from "../redux/types/lessonsTypes";
import LocationProbe from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the lessons item,
// "withoutRight" only the groups page
export function createLessonsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [lessonsApi.reducerPath]: lessonsApi.reducer,
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
                lessonsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token" } as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("groups", "lessons")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("groups")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type LessonsStore = ReturnType<typeof createLessonsStore>;

// renders the element on the given route (several entries make a history to go back in); the other page routes
// render a marker text
export function renderLessonsOnRoute(
    element: ReactElement,
    store: LessonsStore,
    path: string,
    ...urls: string[]
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={urls} initialIndex={urls.length - 1}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/lessons" element={<div>list page</div>} />
                    <Route path="/groupEdit/:grpId" element={<div>group page</div>} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </Provider>
    );
}

export const lessonLookups: ILessonFormLookups = {
    groups: [
        { id: 7, name: "1001 / 2026-2027" },
        { id: 8, name: "201 / 2026-2027" },
    ],
    teacherContracts: [
        { id: 3, name: "Alpha Ann / T3.01" },
        { id: 5, name: "Beta Bob / T3.02" },
    ],
    lessonStatuses: [
        { id: 1, name: "არ გაუქმებულა" },
        { id: 2, name: "გაუქმდა" },
        { id: 3, name: "გაუქმდა მასწავლებლისგან დამოუკიდებელი მიზეზით" },
    ],
};

// a lesson of group 7 with three students (synthetic names), one of them with entered data
export function lessonData(changes: Partial<ILesson> = {}): ILesson {
    return {
        lessonId: 9,
        grpId: 7,
        groupCode: "1001",
        courseName: "Math",
        teacherContractId: 3,
        teacherName: "Alpha Ann / T3.01",
        lessonDt: "2026-09-30T15:00:00",
        salarySchemeName: "Senior",
        fourWeekHours: 8,
        teoMinDate: "2026-09-28T00:00:00",
        teoMaxDate: "2026-10-02T00:00:00",
        lessonStatusId: 1,
        substituteTeacherContractId: null,
        teacherLateMinutes: 0,
        recoverDate: null,
        note: null,
        previousLessonId: 8,
        nextLessonId: 10,
        students: [
            {
                id: 21,
                studentContractId: 10,
                studentName: "Gamma Gia",
                hoursCount: 1.5,
                present: true,
                theme: "Fractions",
                rate: 9,
                teacherComment: "good",
                studentComment: null,
                studentLateMinutes: 5,
            },
            {
                id: 22,
                studentContractId: 11,
                studentName: "Delta Dan",
                hoursCount: 1.5,
                present: false,
                theme: null,
                rate: null,
                teacherComment: null,
                studentComment: null,
                studentLateMinutes: 0,
            },
            {
                id: 23,
                studentContractId: 12,
                studentName: "Epsilon Eva",
                hoursCount: 2,
                present: false,
                theme: null,
                rate: null,
                teacherComment: null,
                studentComment: null,
                studentLateMinutes: 0,
            },
        ],
        ...changes,
    };
}
