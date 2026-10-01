//paymentsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createPaymentsStore } from "../testUtils/paymentsTestStore";
import {
    checkPaymentsClaim,
    paymentEditRoute,
    paymentEditUrl,
    paymentsMenuKey,
    useCanCheckPayments,
    useHasPaymentsRight,
} from "./paymentsMenu";

function renderWith<T>(hook: () => T, menu: MenuState, appClaims?: string[]) {
    const store = createPaymentsStore(menu, appClaims);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(hook, { wrapper }).result.current;
}

describe("useHasPaymentsRight", () => {
    it("is true when the main menu has the payments item", () => {
        expect(renderWith(useHasPaymentsRight, "withRight")).toBe(true);
    });

    it("is false when the main menu lacks the item", () => {
        expect(renderWith(useHasPaymentsRight, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(useHasPaymentsRight, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(useHasPaymentsRight, "notLoaded")).toBeUndefined();
    });
});

describe("useCanCheckPayments", () => {
    it("is true with the special right of checking payments", () => {
        expect(renderWith(useCanCheckPayments, "withRight", ["Other", "CheckPayments"])).toBe(true);
    });

    // the menu item alone does not let a role see or change the checked flag
    it("is false without the special right", () => {
        expect(renderWith(useCanCheckPayments, "withRight", ["RecountAllGroupsLessons"])).toBe(false);
    });

    it("is false for a user without special rights", () => {
        expect(renderWith(useCanCheckPayments, "withRight", [])).toBe(false);
    });

    // a stored user from before the claims were part of the login answer
    it("is false for a user without the claims list", () => {
        expect(renderWith(useCanCheckPayments, "withRight")).toBe(false);
    });
});

describe("route keys", () => {
    it("match the backend menu item, the claim and the editor route", () => {
        expect(paymentsMenuKey).toBe("payments");
        expect(paymentEditRoute).toBe("paymentEdit");
        expect(checkPaymentsClaim).toBe("CheckPayments");
    });

    it("builds the editor addresses", () => {
        expect(paymentEditUrl(5)).toBe("/paymentEdit/5");
        expect(paymentEditUrl()).toBe("/paymentEdit");
    });
});
