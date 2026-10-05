//academicYearChoice.test.tsx

import type { Store } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAcademicYearStore } from "../testUtils/academicYearTestStore";
import { createReportsStore } from "../testUtils/reportsTestStore";
import { createLessonsStore } from "../testUtils/lessonsTestStore";
import { pickAcademicYearId, useDefaultAcademicYearId, useSelectedAcademicYearId } from "./academicYearChoice";

const years = [
    { id: 10, name: "2025-2026" },
    { id: 11, name: "2026-2027" },
];

describe("pickAcademicYearId", () => {
    it("takes the chosen year when the list has it", () => {
        expect(pickAcademicYearId(10, 11, years)).toBe(10);
    });

    it("takes the current year without a choice", () => {
        expect(pickAcademicYearId(null, 11, years)).toBe(11);
    });

    // a deleted year stays in the browser: it is not offered
    it("takes the current year when the chosen one is not in the list", () => {
        expect(pickAcademicYearId(99, 11, years)).toBe(11);
    });

    it("is empty without a current year", () => {
        expect(pickAcademicYearId(null, null, years)).toBeNull();
    });
});

function wrapper(store: Store) {
    return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
}

describe("useDefaultAcademicYearId", () => {
    it("uses the year chosen in the top menu", () => {
        const { result } = renderHook(
            () => useDefaultAcademicYearId({ currentAcademicYearId: 11, academicYears: years }),
            { wrapper: wrapper(createAcademicYearStore("withRight", 10)) }
        );
        expect(result.current).toBe(10);
    });

    it("is the current year without a choice", () => {
        const { result } = renderHook(
            () => useDefaultAcademicYearId({ currentAcademicYearId: 11, academicYears: years }),
            { wrapper: wrapper(createAcademicYearStore()) }
        );
        expect(result.current).toBe(11);
    });

    it("is empty before the lookups load", () => {
        const { result } = renderHook(() => useDefaultAcademicYearId(undefined), {
            wrapper: wrapper(createAcademicYearStore("withRight", 10)),
        });
        expect(result.current).toBeNull();
    });

    // the pages' test stores may have no slice of the global year
    it("reads no choice from a store without the slice", () => {
        const { result } = renderHook(() => useSelectedAcademicYearId(), {
            wrapper: wrapper(createLessonsStore()),
        });
        expect(result.current).toBeNull();
    });

    it("reads the choice of a store with the slice", () => {
        const store = createReportsStore();
        const { result } = renderHook(() => useSelectedAcademicYearId(), {
            wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
        });
        expect(result.current).toBeNull();
    });
});
