//bankTransactionsTestStore.tsx

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import alertReducer from "../appcarcass/redux/slices/alertSlice";
import academicYearReducer from "../redux/slices/academicYearSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import navMenuReducer, { setMenuLoading, setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import userReducer, { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { bankTransactionsApi } from "../redux/api/bankTransactionsApi";
import { academicYearApi } from "../redux/api/academicYearApi";
import type { IBankTransaction, IBankTransactionRow } from "../redux/types/bankTransactionsTypes";
import type { IAcademicYears } from "../redux/types/academicYearTypes";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import LocationProbe from "./LocationProbe";
import { mainMenu, type MenuState } from "./studentContractsTestStore";
import { testBaseUrl } from "./testStore";

// a store with a logged-in user and the main menu in the requested state; "withRight" has the bank transactions item,
// "withoutRight" only the lessons page
export function createBankTransactionsStore(menu: MenuState = "withRight") {
    const store = configureStore({
        reducer: {
            [bankTransactionsApi.reducerPath]: bankTransactionsApi.reducer,
            [academicYearApi.reducerPath]: academicYearApi.reducer,
            academicYearState: academicYearReducer,
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
                bankTransactionsApi.middleware,
                academicYearApi.middleware
            ),
    });
    store.dispatch(setUser({ token: "token" } as unknown as IAppUser));
    if (menu === "withRight") store.dispatch(setNavMenu(mainMenu("lessons", "bankTransactions")));
    if (menu === "withoutRight") store.dispatch(setNavMenu(mainMenu("lessons")));
    if (menu === "loading") store.dispatch(setMenuLoading(true));
    return store;
}

export type BankTransactionsStore = ReturnType<typeof createBankTransactionsStore>;

// renders the element on the given route; the other page routes render a marker text
export function renderBankTransactionsOnRoute(
    element: ReactElement,
    store: BankTransactionsStore,
    path: string,
    url: string
) {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path={path} element={element} />
                    <Route path="/bankTransactions" element={<div>list page</div>} />
                    <Route path="/bankTransactionEdit/:bankTransactionId" element={<div>edit page</div>} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </Provider>
    );
}

export const academicYears: IAcademicYears = {
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    currentAcademicYearId: 11,
};

// the contracts of each year (synthetic names)
export const yearContracts: Record<number, ILookupItem[]> = {
    10: [{ id: 12, name: "Gamma Gia 6.001" }],
    11: [
        { id: 10, name: "Alpha Ann 6.001" },
        { id: 11, name: "Beta Bob 6.002" },
    ],
};

export function bankTransactionRow(changes: Partial<IBankTransactionRow> = {}): IBankTransactionRow {
    return {
        id: 7,
        bankName: "TBC Bank",
        transactionDate: "2026-11-09T00:00:00",
        amount: 100,
        partnerName: "Delta Dan",
        purpose: "tuition",
        matchStep: 4,
        allocatedManually: false,
        ignored: false,
        allocatedAmount: 100,
        hasCheckedPayments: false,
        ...changes,
    };
}

// transaction 7 of 100 GEL, 60 allocated to contract 10
export function bankTransactionData(changes: Partial<IBankTransaction> = {}): IBankTransaction {
    return {
        id: 7,
        bankName: "TBC Bank",
        transactionDate: "2026-11-09T00:00:00",
        amount: 100,
        currency: "GEL",
        purpose: "tuition",
        additionalInformation: "info",
        additionalDescription: null,
        documentNumber: "D1",
        partnerName: "Delta Dan",
        partnerAccountIban: "GE00TB0000000000000100",
        partnerTaxCode: "01001000100",
        matchStep: 2,
        allocatedManually: false,
        ignored: false,
        allocations: [
            {
                paymentId: 30,
                studentContractId: 10,
                studentContractName: "Alpha Ann 6.001",
                academicYearId: 11,
                amount: 60,
                checked: false,
            },
        ],
        ...changes,
    };
}

// the academic year of a studentcontracts request
export function requestedYear(url: string): number {
    return Number(new URL(url).searchParams.get("academicYearId"));
}
