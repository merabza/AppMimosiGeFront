//usePageTitle.test.tsx

import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAcademicYearStore } from "../testUtils/academicYearTestStore";
import { mainMenu } from "../testUtils/studentContractsTestStore";
import { setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import { usePageTitle } from "./usePageTitle";

const TitledLayout = () => {
    usePageTitle();
    return <Link to="/groups">groups</Link>;
};

function renderTitled(store = createAcademicYearStore()) {
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={["/payments"]}>
                <Routes>
                    <Route path="/*" element={<TitledLayout />} />
                    <Route path="/login" element={<div />} />
                </Routes>
                <Link to="/login">login</Link>
            </MemoryRouter>
        </Provider>
    );
    return store;
}

describe("usePageTitle", () => {
    it("sets the menu item's title and follows navigation", () => {
        const store = createAcademicYearStore();
        store.dispatch(setNavMenu(mainMenu("payments", "groups")));
        renderTitled(store);

        expect(document.title).toBe("menu payments - test");

        fireEvent.click(screen.getByText("groups"));
        expect(document.title).toBe("menu groups - test");
    });

    it("updates the title when the menu arrives", () => {
        const store = createAcademicYearStore("notLoaded");
        renderTitled(store);
        expect(document.title).toBe("test");

        act(() => {
            store.dispatch(setNavMenu(mainMenu("payments")));
        });
        expect(document.title).toBe("menu payments - test");
    });

    it("returns to the app name when the layout is left", () => {
        renderTitled();
        expect(document.title).toBe("menu payments - test");

        fireEvent.click(screen.getByText("login"));
        expect(document.title).toBe("test");
    });
});
