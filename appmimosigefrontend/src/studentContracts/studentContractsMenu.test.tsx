//studentContractsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import {
    createStudentContractsStore,
    type MenuState,
} from "../testUtils/studentContractsTestStore";
import {
    studentContractEditRoute,
    studentContractsMenuKey,
    useHasStudentContractsRight,
} from "./studentContractsMenu";

function hasRight(menu: MenuState) {
    const store = createStudentContractsStore(menu);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useHasStudentContractsRight(), { wrapper }).result
        .current;
}

describe("useHasStudentContractsRight", () => {
    it("is true when the main menu has the student contracts item", () => {
        expect(hasRight("withRight")).toBe(true);
    });

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
        expect(studentContractsMenuKey).toBe("studentContracts");
        expect(studentContractEditRoute).toBe("studentContractEdit");
    });
});
