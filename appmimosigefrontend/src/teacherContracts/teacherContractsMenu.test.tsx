//teacherContractsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createTeacherContractsStore } from "../testUtils/teacherContractsTestStore";
import {
    teacherContractEditRoute,
    teacherContractsMenuKey,
    useHasTeacherContractsRight,
} from "./teacherContractsMenu";

function hasRight(menu: MenuState) {
    const store = createTeacherContractsStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useHasTeacherContractsRight(), { wrapper }).result
        .current;
}

describe("useHasTeacherContractsRight", () => {
    it("is true when the main menu has the teacher contracts item", () => {
        expect(hasRight("withRight")).toBe(true);
    });

    // the student contracts item gives no right to the teacher contracts
    it("is false when the main menu lacks the item", () => {
        expect(hasRight("withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(hasRight("loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(hasRight("notLoaded")).toBeUndefined();
    });
});

describe("route keys", () => {
    it("match the backend menu item and the editor route", () => {
        expect(teacherContractsMenuKey).toBe("teacherContracts");
        expect(teacherContractEditRoute).toBe("teacherContractEdit");
    });
});
