//AcademicYearSelector.test.tsx

import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { selectedAcademicYearStorageKey } from "../redux/slices/academicYearSlice";
import {
    academicYears,
    createAcademicYearStore,
    renderWithAcademicYearStore,
} from "../testUtils/academicYearTestStore";
import { mockFetch, testBaseUrl } from "../testUtils/testStore";
import AcademicYearSelector from "./AcademicYearSelector";

const select = () => screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement;

describe("AcademicYearSelector", () => {
    it("lists the years, marks the current one and shows it by default", async () => {
        const calls = mockFetch(() => ({ status: 200, body: academicYears }));
        renderWithAcademicYearStore(<AcademicYearSelector />, createAcademicYearStore());

        await screen.findByLabelText("სასწავლო წელი");
        expect(within(select()).getAllByRole("option").map((o) => o.textContent)).toEqual([
            "2025-2026",
            "2026-2027 (მიმდინარე)",
            "2027-2028",
        ]);
        expect(select().value).toBe("11");
        expect(calls.map((c) => c.url)).toEqual([`${testBaseUrl}/academicyears`]);
    });

    it("shows the year chosen before", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        renderWithAcademicYearStore(<AcademicYearSelector />, createAcademicYearStore("withRight", 12));

        await screen.findByLabelText("სასწავლო წელი");
        expect(select().value).toBe("12");
    });

    it("keeps another year as the choice", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        const store = createAcademicYearStore();
        renderWithAcademicYearStore(<AcademicYearSelector />, store);

        fireEvent.change(await screen.findByLabelText("სასწავლო წელი"), { target: { value: "10" } });

        expect(store.getState().academicYearState.selectedAcademicYearId).toBe(10);
        expect(localStorage.getItem(selectedAcademicYearStorageKey)).toBe("10");
        expect(select().value).toBe("10");
    });

    // the current year is no choice: the default follows the calendar into the next year
    it("clears the choice when the current year is chosen", async () => {
        mockFetch(() => ({ status: 200, body: academicYears }));
        const store = createAcademicYearStore("withRight", 10);
        renderWithAcademicYearStore(<AcademicYearSelector />, store);

        fireEvent.change(await screen.findByLabelText("სასწავლო წელი"), { target: { value: "11" } });

        expect(store.getState().academicYearState.selectedAcademicYearId).toBeNull();
        expect(select().value).toBe("11");
    });

    it("shows nothing without years or when the list fails", async () => {
        const calls = mockFetch(() => ({ status: 500, body: { title: "Boom", status: 500 } }));
        const store = createAcademicYearStore();
        const { container } = renderWithAcademicYearStore(<AcademicYearSelector />, store);

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(calls).toHaveLength(1);
        expect(container).toBeEmptyDOMElement();
        //the selector is on every page: its error is no alert
        expect(store.getState().alertState).toEqual(createAcademicYearStore().getState().alertState);
    });

    it("shows nothing when there are no years", async () => {
        mockFetch(() => ({ status: 200, body: { academicYears: [], currentAcademicYearId: null } }));
        const { container } = renderWithAcademicYearStore(<AcademicYearSelector />, createAcademicYearStore());

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(container).toBeEmptyDOMElement();
    });
});
