//LessonsGenerationResult.test.tsx

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { changedGroup, generation, groupGeneration } from "../testUtils/lessonGeneratorTestData";
import type { ILessonsGeneration } from "../redux/types/lessonGeneratorTypes";
import LessonsGenerationResult from "./LessonsGenerationResult";

function renderResult(result: ILessonsGeneration, onClose = vi.fn()) {
    render(
        <MemoryRouter>
            <LessonsGenerationResult generation={result} onClose={onClose} />
        </MemoryRouter>
    );
    return onClose;
}

describe("LessonsGenerationResult", () => {
    it("shows the horizon and the result of one group without a link", () => {
        renderResult(generation([changedGroup]));

        expect(screen.getByText(/გაკვეთილები დათვლილია 30.11.2027-ის ჩათვლით/)).toBeInTheDocument();
        expect(screen.getByText(/შეიქმნა 1, შეიცვალა 1, წაიშალა 0 გაკვეთილი/)).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        expect(screen.queryByText(/დამუშავდა/)).not.toBeInTheDocument();
    });

    it("lists the errors with their date, lesson and text", () => {
        renderResult(generation([changedGroup]));

        const row = screen.getByText(/6. ამ დღეს არცერთი მასწავლებლის/).closest("tr") as HTMLElement;
        expect(within(row).getByText("21.09.2026 00:00")).toBeInTheDocument();
    });

    it("lists the changes with the previous time of a moved lesson", () => {
        renderResult(generation([changedGroup]));

        expect(screen.getByText("ცვლილებები (2)")).toBeInTheDocument();
        const moved = screen.getByText("28.09.2026 14:30 → 28.09.2026 15:00").closest("tr") as HTMLElement;
        expect(within(moved).getByText("შეიცვალა")).toBeInTheDocument();
        expect(within(moved).getByText("100")).toBeInTheDocument();
        expect(within(moved).getByText(/დრო, თვის თეორიული პირველი გაკვეთილი/)).toBeInTheDocument();
        const created = screen.getByText("14.09.2026 15:00").closest("tr") as HTMLElement;
        expect(within(created).getByText("შეიქმნა")).toBeInTheDocument();
        expect(within(created).getByText("501")).toBeInTheDocument();
    });

    it("says so when one group needed no change", () => {
        renderResult(generation([groupGeneration()]));

        expect(screen.getByText("გაკვეთილები უკვე ისეთია, როგორიც უნდა იყოს.")).toBeInTheDocument();
        expect(screen.queryByText(/შეიქმნა/)).not.toBeInTheDocument();
    });

    it("shows only the changed groups of many, each with a link to the group", () => {
        renderResult(generation([groupGeneration({ grpId: 5, groupCode: "0901" }), changedGroup]));

        expect(screen.getByText(/დამუშავდა 2 ჯგუფი, ცვლილება ან შეცდომა აქვს 1-ს/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "ჯგუფი 1001" })).toHaveAttribute("href", "/groupEdit/7");
        expect(screen.queryByRole("link", { name: "ჯგუფი 0901" })).not.toBeInTheDocument();
        expect(screen.queryByText("გაკვეთილები უკვე ისეთია, როგორიც უნდა იყოს.")).not.toBeInTheDocument();
    });

    it("tells about added operation months", () => {
        renderResult(generation([groupGeneration()], 2));

        expect(screen.getByText(/დაემატა 2 სამუშაო თვე/)).toBeInTheDocument();
    });

    it("closes", () => {
        const onClose = renderResult(generation([changedGroup]));

        fireEvent.click(screen.getByRole("button", { name: /close/i }));

        expect(onClose).toHaveBeenCalledOnce();
    });
});
