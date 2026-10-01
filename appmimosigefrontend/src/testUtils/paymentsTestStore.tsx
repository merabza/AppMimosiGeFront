//paymentsTestStore.tsx

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
import { paymentsApi } from "../redux/api/paymentsApi";
import type {
    IPayment,
    IPaymentFormLookups,
    IPaymentRow,
} from "../redux/types/paymentsTypes";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import LocationProbe from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user (with the given special rights, none by default) and the main menu in the requested
// state; "withRight" has the payments item, "withoutRight" only the lessons page
export function createPaymentsStore(menu: MenuState = "withRight", appClaims?: string[]) {
    const store = configureStore({
        reducer: {
            [paymentsApi.reducerPath]: paymentsApi.reducer,
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
                paymentsApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token", appClaims } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("lessons", "payments")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("lessons")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type PaymentsStore = ReturnType<typeof createPaymentsStore>;

// renders the element on the given route (several entries make a history to go back in); the other page routes
// render a marker text
export function renderPaymentsOnRoute(
    element: ReactElement,
    store: PaymentsStore,
    path: string,
    ...urls: string[]
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={urls} initialIndex={urls.length - 1}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/payments" element={<div>list page</div>} />
                    <Route path="/paymentEdit/:paymentId" element={<div>edit page</div>} />
                    <Route path="/paymentEdit" element={<div>new page</div>} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </Provider>
    );
}

export const paymentLookups: IPaymentFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    bankAccounts: [
        { id: 4, name: "Alpha Bank" },
        { id: 9, name: "Transfer" },
        { id: 1, name: "Zeta Bank" },
    ],
};

// the contracts of each year (synthetic names)
export const yearContracts: Record<number, ILookupItem[]> = {
    10: [{ id: 12, name: "Gamma Gia 6.001" }],
    11: [
        { id: 10, name: "Alpha Ann 6.001" },
        { id: 11, name: "Beta Bob 6.002" },
        { id: 13, name: "Gamma Gia 6.003" },
    ],
};

// a payment of contract 10 (2026-2027)
export function paymentData(changes: Partial<IPayment> = {}): IPayment {
    return {
        id: 5,
        studentContractId: 10,
        studentContractName: "Alpha Ann 6.001",
        academicYearId: 11,
        payDate: "2026-09-15T00:00:00",
        amount: 300,
        document: "N 15",
        bankAccountId: 1,
        checked: false,
        ...changes,
    };
}

export const paymentRow: IPaymentRow = {
    id: 5,
    studentContractId: 10,
    studentName: "Alpha Ann 6.001",
    payDate: "2026-09-15T00:00:00",
    amount: 300,
    document: "N 15",
    bankAccountId: 1,
    bankName: "Zeta Bank",
    checked: true,
};

// the academic year of a studentcontracts request
export function requestedYear(url: string): number {
    return Number(new URL(url).searchParams.get("academicYearId"));
}
