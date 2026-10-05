//academicYearTestStore.tsx

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import alertReducer from "../appcarcass/redux/slices/alertSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import navMenuReducer, { setMenuLoading, setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import userReducer, { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { academicYearApi } from "../redux/api/academicYearApi";
import academicYearReducer from "../redux/slices/academicYearSlice";
import type {
    IAcademicYearInfo,
    IAcademicYears,
    IAcademicYearWizardInfo,
    ICloseAcademicYearGroups,
    ICloseGroup,
} from "../redux/types/academicYearTypes";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the wizard's item,
// "withoutRight" only the payments page. selectedAcademicYearId: the global year chosen before
export function createAcademicYearStore(menu: MenuState = "withRight", selectedAcademicYearId: number | null = null) {
    const store = configureStore({
        reducer: {
            [academicYearApi.reducerPath]: academicYearApi.reducer,
            academicYearState: academicYearReducer,
            alertState: alertReducer,
            appParametersState: appParametersReducer,
            navMenuState: navMenuReducer,
            userState: userReducer,
        },
        preloadedState: {
            appParametersState: { appName: "test", baseUrl: testBaseUrl },
            academicYearState: { selectedAcademicYearId },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(academicYearApi.middleware),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("payments", "newAcademicYear")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("payments")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type AcademicYearStore = ReturnType<typeof createAcademicYearStore>;

export function renderWithAcademicYearStore(element: ReactElement, store: AcademicYearStore) {
    return render(
        <Provider store={store}>
            <MemoryRouter>{element}</MemoryRouter>
        </Provider>
    );
}

export const academicYears: IAcademicYears = {
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
        { id: 12, name: "2027-2028" },
    ],
    currentAcademicYearId: 11,
};

export function yearInfo(ayId: number, startYear: number, changes: Partial<IAcademicYearInfo> = {}): IAcademicYearInfo {
    return {
        ayId,
        academicYearName: `${startYear}-${startYear + 1}`,
        startDate: `${startYear}-09-01T00:00:00`,
        finishDate: `${startYear + 1}-09-01T00:00:00`,
        studentContractsCount: 130,
        groupsCount: 56,
        openGroupsCount: 56,
        ...changes,
    };
}

export const wizardInfo: IAcademicYearWizardInfo = {
    academicYears: [yearInfo(10, 2025, { openGroupsCount: 0 }), yearInfo(11, 2026)],
    currentAcademicYearId: 11,
    lastOperationMonth: "2027-11-01T00:00:00",
    horizonEnd: "2027-11-30T00:00:00",
};

export function closeGroup(grpId: number, changes: Partial<ICloseGroup> = {}): ICloseGroup {
    return {
        grpId,
        groupCode: `G${grpId}`,
        courseName: "English",
        previousVoidDate: null,
        openTeacherRowsCount: 1,
        openStudentRowsCount: 2,
        openScheduleRowsCount: 1,
        deletedLessonsCharges: -9,
        generation: {
            grpId,
            groupCode: `G${grpId}`,
            createdLessonsCount: 0,
            updatedLessonsCount: 0,
            deletedLessonsCount: 1,
            addedStudentsCount: 0,
            updatedStudentsCount: 0,
            deletedStudentsCount: 0,
            dirtyStudentContractsCount: 1,
            errors: [{ errorCode: 11, errorText: "extra lesson", lessonDate: "2027-09-13T15:00:00", lessonId: 701 }],
            changes: [],
        },
        ...changes,
    };
}

export function closeResult(dryRun: boolean, groups: ICloseGroup[]): ICloseAcademicYearGroups {
    return {
        dryRun,
        academicYearId: 11,
        closeDate: "2027-09-01T00:00:00",
        horizonEnd: "2027-11-30T00:00:00",
        groups,
    };
}
