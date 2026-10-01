//balancesTestStore.tsx

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
import { chargesAndPaymentsApi } from "../redux/api/chargesAndPaymentsApi";
import { depositsApi } from "../redux/api/depositsApi";
import type {
    IBalancesFormLookups,
    IBalancesRecount,
    IDepositRow,
    IStatementRow,
} from "../redux/types/balancesTypes";
import LocationProbe from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user (with the given special rights, none by default) and the main menu in the requested
// state; "withRight" has both balance pages, "withoutRight" only the payments page
export function createBalancesStore(menu: MenuState = "withRight", appClaims?: string[]) {
    const store = configureStore({
        reducer: {
            [chargesAndPaymentsApi.reducerPath]: chargesAndPaymentsApi.reducer,
            [depositsApi.reducerPath]: depositsApi.reducer,
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
                chargesAndPaymentsApi.middleware,
                depositsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token", appClaims } as unknown as IAppUser));
    if (menu === "withRight")
        store.dispatch(setNavMenu(mainMenu("payments", "chargesAndPayments", "deposits")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("payments")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type BalancesStore = ReturnType<typeof createBalancesStore>;

// renders the element on the given route; the other page renders a marker text
export function renderBalancesOnRoute(
    element: ReactElement,
    store: BalancesStore,
    path: string,
    url: string
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/chargesAndPayments" element={<div>statement page</div>} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </Provider>
    );
}

export const balancesLookups: IBalancesFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
};

// a charge (lesson row 31) and a payment (7) of contract 10 (synthetic names)
export function statementRow(changes: Partial<IStatementRow> = {}): IStatementRow {
    return {
        isPayment: false,
        id: 31,
        studentContractId: 10,
        studentName: "Alpha Ann / 6.001",
        operationDate: "2026-09-15T15:00:00",
        document: "English",
        amount: -8.3333,
        runningTotal: 91.6667,
        ...changes,
    };
}

export function depositRow(changes: Partial<IDepositRow> = {}): IDepositRow {
    return {
        studentContractId: 10,
        academicYearId: 11,
        studentName: "Alpha Ann",
        contractNumber: "6.001",
        balance: -54,
        studentPhone: "555123456",
        payerName: "Beta Bob",
        payerPhone: "599000111",
        nextLessonDate: "2026-10-02T16:30:00",
        crmMustPayDate: "2026-10-05T00:00:00",
        fourWeekFee: 324,
        desiredMonthlyPaymentDay: 15,
        desiredNextPayDate: "2026-10-15T00:00:00",
        desiredAfterNextPayDate: "2026-11-16T00:00:00",
        desiredDayAmount: 120.5,
        stopDate: "2026-10-02T16:30:00",
        mustPayToEnd: 4968,
        endDate: "2027-12-01T00:00:00",
        ...changes,
    };
}

export const recountResult: IBalancesRecount = {
    groupsCount: 26,
    changedGroupsCount: 22,
    groupErrorsCount: 0,
    studentContractsCount: 121,
    changedNextPayDatesCount: 39,
};

// the parameters of a deposits rows request
export function depositsParams(url: string): Record<string, string> {
    return Object.fromEntries(new URL(url).searchParams.entries());
}
