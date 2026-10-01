//lessonsMenu.test.tsx

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { setMenuLoading, setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import { mainMenu, type MenuState } from "../testUtils/studentContractsTestStore";
import { createLessonsStore, type LessonsStore } from "../testUtils/lessonsTestStore";
import {
    groupLessonsUrl,
    lessonEditRoute,
    lessonEditUrl,
    lessonsMenuKey,
    useHasLessonsRight,
} from "./lessonsMenu";

function hasRightIn(store: LessonsStore) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useHasLessonsRight(), { wrapper }).result.current;
}

function hasRight(menu: MenuState) {
    return hasRightIn(createLessonsStore(menu));
}

describe("useHasLessonsRight", () => {
    it("is true when the main menu has the lessons item", () => {
        expect(hasRight("withRight")).toBe(true);
    });

    it("is true when the lessons item is one of several", () => {
        const store = createLessonsStore("notLoaded");
        store.dispatch(setNavMenu(mainMenu("studentContracts", "lessons", "groups")));

        expect(hasRightIn(store)).toBe(true);
    });

    // the groups page gives no right to the journal
    it("is false when the main menu lacks the item", () => {
        expect(hasRight("withoutRight")).toBe(false);
    });

    it("is undefined while the menu is loading", () => {
        expect(hasRight("loading")).toBeUndefined();
    });

    it("is undefined before the menu is loaded", () => {
        expect(hasRight("notLoaded")).toBeUndefined();
    });

    // a menu that is loaded again (after a sign-in) is not trusted until it has arrived
    it("is undefined while a loaded menu is loading again", () => {
        const store = createLessonsStore("withRight");
        store.dispatch(setMenuLoading(true));

        expect(hasRightIn(store)).toBeUndefined();
    });
});

describe("routes", () => {
    it("match the backend menu item and the editor route", () => {
        expect(lessonsMenuKey).toBe("lessons");
        expect(lessonEditRoute).toBe("lessonEdit");
    });

    it("open one lesson in the journal", () => {
        expect(lessonEditUrl(4165)).toBe("/lessonEdit/4165");
    });

    // the list reads empty dates as no date filter, so every lesson of the group is listed
    it("list all lessons of a group without a date range", () => {
        expect(groupLessonsUrl(7)).toBe("/lessons?grpId=7&dateFrom=&dateTo=");
    });
});
