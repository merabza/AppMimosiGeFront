//workHoursMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createWorkHoursStore } from "../testUtils/workHoursTestStore";
import {
    useHasWorkHoursRight,
    workHourEditRoute,
    workHourEditUrl,
    workHoursMenuKey,
} from "./workHoursMenu";

function renderWith<T>(hook: () => T, menu: MenuState) {
    const store = createWorkHoursStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(hook, { wrapper }).result.current;
}

describe("useHasWorkHoursRight", () => {
    it("is true when the main menu has the work hours item", () => {
        expect(renderWith(useHasWorkHoursRight, "withRight")).toBe(true);
    });

    // another accounting page does not give the work hours
    it("is false when the main menu lacks the item", () => {
        expect(renderWith(useHasWorkHoursRight, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(useHasWorkHoursRight, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(useHasWorkHoursRight, "notLoaded")).toBeUndefined();
    });
});

describe("route keys", () => {
    it("match the backend menu item and the editor route", () => {
        expect(workHoursMenuKey).toBe("workHours");
        expect(workHourEditRoute).toBe("workHourEdit");
    });

    it("builds the editor addresses", () => {
        expect(workHourEditUrl(5)).toBe("/workHourEdit/5");
        expect(workHourEditUrl()).toBe("/workHourEdit");
    });
});
