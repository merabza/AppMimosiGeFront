//LookupPicker.test.tsx

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { reportLookups } from "../testUtils/reportsTestStore";
import LookupPicker from "./LookupPicker";

function Picker({ initial = "", onChange = () => undefined }: { initial?: string; onChange?: (v: string) => void }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <LookupPicker
                id="teacher"
                label="მასწავლებელი"
                items={reportLookups.teachers}
                value={value}
                onChange={(v) => {
                    setValue(v);
                    onChange(v);
                }}
            />
            <div data-testid="value">{value}</div>
        </>
    );
}

const input = () => screen.getByLabelText("მასწავლებელი") as HTMLInputElement;

describe("LookupPicker", () => {
    it("shows the chosen item's name, empty means all", () => {
        render(<Picker initial="6" />);
        expect(input().value).toBe("Beta Bob / T6");
        expect(input().placeholder).toBe("ყველა");
    });

    // an id that is not in the list shows no name, but the filter can still be cleared
    it("shows an empty field for an unknown chosen id", () => {
        render(<Picker initial="99" />);

        expect(input().value).toBe("");
        expect(screen.getByTitle("მასწავლებელი: ფილტრის მოხსნა")).toBeInTheDocument();
    });

    // a long list stays over the form below it and scrolls
    it("shows the list over the form with a scroll", () => {
        render(<Picker />);

        fireEvent.focus(input());

        expect(screen.getByText("Alpha Ann / T5").closest(".list-group")).toHaveStyle({
            zIndex: "10",
            maxHeight: "20rem",
            overflowY: "auto",
        });
    });

    // the item is chosen on mouse down, before the field loses the focus
    it("keeps the focus when an item is chosen with the mouse", () => {
        render(<Picker />);

        fireEvent.focus(input());
        const event = fireEvent.mouseDown(screen.getByText("Alpha Ann / T5"));

        expect(event).toBe(false);
    });

    it("opens the list again when the user types after a choice", () => {
        render(<Picker />);

        fireEvent.focus(input());
        fireEvent.mouseDown(screen.getByText("Beta Bob / T6"));
        fireEvent.change(input(), { target: { value: "alpha" } });

        expect(screen.getByText("Alpha Ann / T5")).toBeInTheDocument();
        expect(screen.queryByText("Beta Bob / T6")).not.toBeInTheDocument();
    });

    // a new focus starts a new search: the old search text is gone
    it("starts a new search when focused again", async () => {
        vi.useFakeTimers();
        render(<Picker />);

        fireEvent.focus(input());
        fireEvent.change(input(), { target: { value: "zzz" } });
        fireEvent.blur(input());
        act(() => {
            vi.advanceTimersByTime(200);
        });
        vi.useRealTimers();
        fireEvent.focus(input());

        expect(input().value).toBe("");
        expect(await screen.findByText("Alpha Ann / T5")).toBeInTheDocument();
        expect(screen.getByText("Beta Bob / T6")).toBeInTheDocument();
    });

    it("lists every item when focused and chooses one with the mouse", () => {
        render(<Picker />);

        fireEvent.focus(input());
        const options = screen.getAllByRole("button").filter((b) => b.textContent?.includes("/"));
        expect(options.map((o) => o.textContent)).toEqual(["Alpha Ann / T5", "Beta Bob / T6"]);
        expect(screen.queryByText("ვერ მოიძებნა")).not.toBeInTheDocument();

        fireEvent.mouseDown(screen.getByText("Beta Bob / T6"));
        expect(screen.getByTestId("value").textContent).toBe("6");
        expect(input().value).toBe("Beta Bob / T6");
        expect(screen.queryByText("Alpha Ann / T5")).not.toBeInTheDocument();
    });

    // every word of the search, in any order
    it("filters by the words of the search", () => {
        render(<Picker />);

        fireEvent.focus(input());
        fireEvent.change(input(), { target: { value: "t5 alpha" } });

        expect(screen.getByText("Alpha Ann / T5")).toBeInTheDocument();
        expect(screen.queryByText("Beta Bob / T6")).not.toBeInTheDocument();
    });

    it("says when nothing is found", () => {
        render(<Picker />);

        fireEvent.focus(input());
        fireEvent.change(input(), { target: { value: "zzz" } });

        expect(screen.getByText("ვერ მოიძებნა")).toBeInTheDocument();
    });

    // Enter does not submit; the only match is chosen
    it("chooses the only match with Enter", () => {
        const onChange = vi.fn();
        render(<Picker onChange={onChange} />);

        fireEvent.focus(input());
        fireEvent.change(input(), { target: { value: "beta" } });
        const event = fireEvent.keyDown(input(), { key: "Enter" });

        expect(event).toBe(false);
        expect(onChange).toHaveBeenCalledWith("6");
    });

    it("does not choose with Enter when several match", () => {
        const onChange = vi.fn();
        render(<Picker onChange={onChange} />);

        fireEvent.focus(input());
        fireEvent.keyDown(input(), { key: "Enter" });

        expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores other keys", () => {
        const onChange = vi.fn();
        render(<Picker onChange={onChange} />);

        fireEvent.focus(input());
        fireEvent.change(input(), { target: { value: "beta" } });
        const event = fireEvent.keyDown(input(), { key: "a" });

        expect(event).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("clears the filter with ×", () => {
        render(<Picker initial="5" />);

        fireEvent.click(screen.getByTitle("მასწავლებელი: ფილტრის მოხსნა"));

        expect(screen.getByTestId("value").textContent).toBe("");
        expect(screen.queryByTitle("მასწავლებელი: ფილტრის მოხსნა")).not.toBeInTheDocument();
    });

    it("closes the list after leaving the field", async () => {
        vi.useFakeTimers();
        render(<Picker />);

        fireEvent.focus(input());
        expect(screen.getByText("Alpha Ann / T5")).toBeInTheDocument();
        fireEvent.blur(input());
        expect(screen.getByText("Alpha Ann / T5")).toBeInTheDocument();
        vi.advanceTimersByTime(200);
        vi.useRealTimers();

        expect(await screen.findByLabelText("მასწავლებელი")).toBeInTheDocument();
        expect(screen.queryByText("Alpha Ann / T5")).not.toBeInTheDocument();
    });
});
