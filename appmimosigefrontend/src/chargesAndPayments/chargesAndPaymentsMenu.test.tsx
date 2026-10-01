//chargesAndPaymentsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import { mainMenu, type MenuState } from "../testUtils/studentContractsTestStore";
import { createBalancesStore } from "../testUtils/balancesTestStore";
import { chargesAndPaymentsMenuKey, useHasChargesAndPaymentsRight } from "./chargesAndPaymentsMenu";
import { depositsMenuKey, useHasDepositsRight } from "../deposits/depositsMenu";

function renderWith<T>(hook: () => T, menu: MenuState) {
    const store = createBalancesStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(hook, { wrapper }).result.current;
}

describe.each([
    ["useHasChargesAndPaymentsRight", useHasChargesAndPaymentsRight],
    ["useHasDepositsRight", useHasDepositsRight],
])("%s", (_name, hook) => {
    it("is true when the main menu has the item", () => {
        expect(renderWith(hook, "withRight")).toBe(true);
    });

    it("is false when the main menu lacks the item", () => {
        expect(renderWith(hook, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(hook, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(hook, "notLoaded")).toBeUndefined();
    });
});

// each page checks its own item: the other balance page's item is not enough
describe("one item only", () => {
    function renderWithMenu<T>(hook: () => T, menKey: string) {
        const store = createBalancesStore("notLoaded");
        store.dispatch(setNavMenu(mainMenu(menKey)));
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        return renderHook(hook, { wrapper }).result.current;
    }

    it("the deposits item does not open the statement", () => {
        expect(renderWithMenu(useHasChargesAndPaymentsRight, "deposits")).toBe(false);
        expect(renderWithMenu(useHasDepositsRight, "deposits")).toBe(true);
    });

    it("the statement item does not open the deposits", () => {
        expect(renderWithMenu(useHasDepositsRight, "chargesAndPayments")).toBe(false);
        expect(renderWithMenu(useHasChargesAndPaymentsRight, "chargesAndPayments")).toBe(true);
    });
});

describe("menu keys", () => {
    it("match the backend menu items", () => {
        expect(chargesAndPaymentsMenuKey).toBe("chargesAndPayments");
        expect(depositsMenuKey).toBe("deposits");
    });
});
