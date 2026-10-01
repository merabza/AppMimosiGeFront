//groupsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import { mainMenu, type MenuState } from "../testUtils/studentContractsTestStore";
import { createGroupsStore, type GroupsStore } from "../testUtils/groupsTestStore";
import { groupEditRoute, groupsMenuKey, useHasGroupsRight } from "./groupsMenu";

function hasRightIn(store: GroupsStore) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useHasGroupsRight(), { wrapper }).result.current;
}

function hasRight(menu: MenuState) {
    return hasRightIn(createGroupsStore(menu));
}

describe("useHasGroupsRight", () => {
    it("is true when the main menu has the groups item", () => {
        expect(hasRight("withRight")).toBe(true);
    });

    it("is true when the groups item is one of several", () => {
        const store = createGroupsStore("notLoaded");
        store.dispatch(setNavMenu(mainMenu("studentContracts", "groups", "teacherContracts")));

        expect(hasRightIn(store)).toBe(true);
    });

    // the contract pages give no right to the groups
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
        expect(groupsMenuKey).toBe("groups");
        expect(groupEditRoute).toBe("groupEdit");
    });
});
