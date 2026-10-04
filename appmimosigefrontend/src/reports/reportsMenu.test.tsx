//reportsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createReportsStore } from "../testUtils/reportsTestStore";
import { reportsMenuKey, useHasReportsRight } from "./reportsMenu";

function renderWith<T>(hook: () => T, menu: MenuState) {
    const store = createReportsStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    return renderHook(hook, { wrapper }).result.current;
}

describe("useHasReportsRight", () => {
    it("is true when the main menu has the reports item", () => {
        expect(renderWith(useHasReportsRight, "withRight")).toBe(true);
    });

    it("is false when the main menu lacks the item", () => {
        expect(renderWith(useHasReportsRight, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(useHasReportsRight, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(useHasReportsRight, "notLoaded")).toBeUndefined();
    });
});

describe("reportsMenuKey", () => {
    it("is the backend menu item", () => {
        expect(reportsMenuKey).toBe("reports");
    });
});
