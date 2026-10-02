//crmCallsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createCrmCallsStore } from "../testUtils/crmCallsTestStore";
import {
    crmCallEditRoute,
    crmCallEditUrl,
    crmCallsMenuKey,
    useHasCrmCallsRight,
} from "./crmCallsMenu";

function renderWith<T>(hook: () => T, menu: MenuState) {
    const store = createCrmCallsStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(hook, { wrapper }).result.current;
}

describe("useHasCrmCallsRight", () => {
    it("is true when the main menu has the CRM calls item", () => {
        expect(renderWith(useHasCrmCallsRight, "withRight")).toBe(true);
    });

    // the deposits page alone does not give the calls
    it("is false when the main menu lacks the item", () => {
        expect(renderWith(useHasCrmCallsRight, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(useHasCrmCallsRight, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(useHasCrmCallsRight, "notLoaded")).toBeUndefined();
    });
});

describe("route keys", () => {
    it("match the backend menu item and the editor route", () => {
        expect(crmCallsMenuKey).toBe("crmCalls");
        expect(crmCallEditRoute).toBe("crmCallEdit");
    });

    it("builds the editor addresses", () => {
        expect(crmCallEditUrl(5)).toBe("/crmCallEdit/5");
        expect(crmCallEditUrl()).toBe("/crmCallEdit");
    });
});
