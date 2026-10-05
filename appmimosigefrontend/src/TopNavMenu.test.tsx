//TopNavMenu.test.tsx

import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { academicYears, createAcademicYearStore } from "./testUtils/academicYearTestStore";
import { mockFetch } from "./testUtils/testStore";
import TopNavMenu from "./TopNavMenu";

// the carcass top menus need their own stores: markers show which one a route chose
vi.mock("./appcarcass/rights/RightsTopNavMenu", () => ({ default: () => "rights menu" }));
vi.mock("./appcarcass/user/ProfileTopNavMenu", () => ({ default: () => "profile menu" }));

function renderMenu(url = "/") {
    const store = createAcademicYearStore();
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <TopNavMenu />
            </MemoryRouter>
        </Provider>
    );
    return store;
}

describe("TopNavMenu", () => {
    it("opens and closes the side menu with the menu button", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        const store = renderMenu();
        await screen.findByLabelText("სასწავლო წელი");

        fireEvent.click(screen.getByRole("button", { name: /მენიუ/ }));
        expect(store.getState().navMenuState.active).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: /მენიუ/ }));
        expect(store.getState().navMenuState.active).toBe(false);
    });

    // part 20: the global academic year is in the top menu on every page
    it("shows the global academic year", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        renderMenu();

        expect(await screen.findByLabelText("სასწავლო წელი")).toHaveValue("11");
    });

    it("shows no carcass menu on the home page", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        renderMenu("/");
        await screen.findByLabelText("სასწავლო წელი");

        expect(screen.queryByText("rights menu")).not.toBeInTheDocument();
        expect(screen.queryByText("profile menu")).not.toBeInTheDocument();
    });

    it.each(["/Rights/roles/Menu/Admin", "/Rights/roles/Menu", "/Rights/roles", "/Rights"])(
        "shows the rights menu on %s",
        async (url) => {
            mockFetch(() => ({ status: 200, body: academicYears }));
            renderMenu(url);
            await screen.findByLabelText("სასწავლო წელი");

            expect(screen.getByText("rights menu")).toBeInTheDocument();
            expect(screen.queryByText("profile menu")).not.toBeInTheDocument();
        }
    );

    it("shows the profile menu on the profile page", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        renderMenu("/profile");
        await screen.findByLabelText("სასწავლო წელი");

        expect(screen.getByText("profile menu")).toBeInTheDocument();
        expect(screen.queryByText("rights menu")).not.toBeInTheDocument();
    });

    // a page of the project has no carcass menu either
    it("shows no carcass menu on a project page", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        renderMenu("/studentContracts");
        await screen.findByLabelText("სასწავლო წელი");

        expect(screen.queryByText("rights menu")).not.toBeInTheDocument();
        expect(screen.queryByText("profile menu")).not.toBeInTheDocument();
    });
});
