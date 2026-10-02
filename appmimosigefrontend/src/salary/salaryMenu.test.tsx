//salaryMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createSalaryStore } from "../testUtils/salaryTestStore";
import { salaryEditRoute, salaryEditUrl, salaryMenuKey, useHasSalaryRight } from "./salaryMenu";

function renderWith<T>(hook: () => T, menu: MenuState) {
    const store = createSalaryStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    return renderHook(hook, { wrapper }).result.current;
}

describe("useHasSalaryRight", () => {
    it("is true when the main menu has the salary item", () => {
        expect(renderWith(useHasSalaryRight, "withRight")).toBe(true);
    });

    // another accounting page does not give the salary
    it("is false when the main menu lacks the item", () => {
        expect(renderWith(useHasSalaryRight, "withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(renderWith(useHasSalaryRight, "loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(renderWith(useHasSalaryRight, "notLoaded")).toBeUndefined();
    });
});

describe("route keys", () => {
    it("match the backend menu item and the editor route", () => {
        expect(salaryMenuKey).toBe("salary");
        expect(salaryEditRoute).toBe("salaryEdit");
    });

    it("builds the editor addresses", () => {
        expect(salaryEditUrl(2)).toBe("/salaryEdit/2");
        expect(salaryEditUrl()).toBe("/salaryEdit");
    });
});
