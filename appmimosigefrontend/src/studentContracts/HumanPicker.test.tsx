//HumanPicker.test.tsx

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetch, type FetchReply } from "../testUtils/testStore";
import { createStudentContractsStore } from "../testUtils/studentContractsTestStore";
import HumanPicker from "./HumanPicker";

function renderPicker(humanId = 0, humanName = "") {
    const onChange = vi.fn();
    render(
        <Provider store={createStudentContractsStore()}>
            <MemoryRouter>
                <HumanPicker
                    id="student"
                    label="მოსწავლე"
                    humanId={humanId}
                    humanName={humanName}
                    onChange={onChange}
                />
            </MemoryRouter>
        </Provider>
    );
    return { onChange, input: screen.getByLabelText("მოსწავლე") };
}

function search(input: HTMLElement, text: string) {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
}

describe("HumanPicker", () => {
    it("shows the chosen person's name", () => {
        const { input } = renderPicker(5, "Alpha Ann");

        expect(input).toHaveValue("Alpha Ann");
        expect(input).not.toHaveClass("is-invalid");
    });

    it("marks the field invalid while nobody is chosen", () => {
        const { input } = renderPicker();

        expect(input).toHaveClass("is-invalid");
    });

    it("starts a new search from an empty text on focus", () => {
        const { input } = renderPicker(5, "Alpha Ann");

        fireEvent.focus(input);

        expect(input).toHaveValue("");
    });

    it("searches the server and returns the chosen person", async () => {
        const calls = mockFetch(() => ({
            status: 200,
            body: [
                { id: 1, name: "Alpha Ann" },
                { id: 2, name: "Beta Bob" },
            ],
        }));
        const { input, onChange } = renderPicker();

        search(input, " be ");
        fireEvent.mouseDown(await screen.findByText("Beta Bob"));

        expect(calls).toHaveLength(1);
        expect(calls[0].url).toContain("/studentcontracts/humans?search=be");
        expect(onChange).toHaveBeenCalledWith(2, "Beta Bob");
        expect(screen.queryByText("Alpha Ann")).not.toBeInTheDocument();
    });

    describe("with fake timers", () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        // runs the debounce timer and lets the mocked fetch and the re-render finish
        const settle = (ms = 1000) => act(() => vi.advanceTimersByTimeAsync(ms));

        it("does not search for a single character, spaces not counted", async () => {
            const calls = mockFetch(() => ({ status: 200, body: [] }));
            const { input } = renderPicker();

            search(input, " a ");
            await settle();

            expect(calls).toHaveLength(0);
            expect(screen.queryByText("ვერ მოიძებნა")).not.toBeInTheDocument();
        });

        it("searches only for the last text typed within the pause", async () => {
            const calls = mockFetch(() => ({ status: 200, body: [] }));
            const { input } = renderPicker();

            search(input, "ab");
            await settle(100);
            fireEvent.change(input, { target: { value: "abc" } });
            await settle();

            expect(calls.map((c) => c.url.split("search=")[1])).toEqual(["abc"]);
        });

        it("hides earlier results when the text gets too short", async () => {
            mockFetch(() => ({ status: 200, body: [{ id: 1, name: "Alpha Ann" }] }));
            const { input } = renderPicker();
            search(input, "al");
            await settle();
            expect(screen.getByText("Alpha Ann")).toBeInTheDocument();

            fireEvent.change(input, { target: { value: " a " } });
            await settle();

            expect(screen.queryByText("Alpha Ann")).not.toBeInTheDocument();
        });

        it("does not search again after a person is chosen", async () => {
            const calls = mockFetch(() => ({ status: 200, body: [{ id: 1, name: "Alpha Ann" }] }));
            const { input } = renderPicker();
            search(input, "al");
            await settle();

            fireEvent.mouseDown(screen.getByText("Alpha Ann"));
            await settle();

            expect(calls).toHaveLength(1);
        });

        it("shows found people without the waiting and not-found lines", async () => {
            mockFetch(() => ({ status: 200, body: [{ id: 1, name: "Alpha Ann" }] }));
            const { input } = renderPicker();

            search(input, "al");
            await settle();

            expect(screen.getByText("Alpha Ann")).toBeInTheDocument();
            expect(screen.queryByText("იძებნება...")).not.toBeInTheDocument();
            expect(screen.queryByText("ვერ მოიძებნა")).not.toBeInTheDocument();
        });

        // mouse down on a result must not take the focus away before the choice is made
        it("keeps the focus in the field when a result is pressed", async () => {
            mockFetch(() => ({ status: 200, body: [{ id: 1, name: "Alpha Ann" }] }));
            const { input } = renderPicker();
            search(input, "al");
            await settle();

            expect(fireEvent.mouseDown(screen.getByText("Alpha Ann"))).toBe(false);
        });
    });

    it("says so when nobody is found", async () => {
        mockFetch(() => ({ status: 200, body: [] }));
        const { input } = renderPicker();

        search(input, "zz");

        expect(await screen.findByText("ვერ მოიძებნა")).toBeInTheDocument();
    });

    it("shows a waiting line while the search runs", async () => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        const { input } = renderPicker();

        search(input, "zz");

        expect(await screen.findByText("იძებნება...")).toBeInTheDocument();
    });

    it("closes the list when the field loses focus", async () => {
        mockFetch(() => ({ status: 200, body: [{ id: 1, name: "Alpha Ann" }] }));
        const { input } = renderPicker(3, "Gamma Gia");
        search(input, "al");
        expect(await screen.findByText("Alpha Ann")).toBeInTheDocument();

        fireEvent.blur(input);

        await waitFor(() => expect(input).toHaveValue("Gamma Gia"));
        expect(screen.queryByText("Alpha Ann")).not.toBeInTheDocument();
    });

    it("links to the new person form in a new tab", () => {
        renderPicker();

        const link = screen.getByTitle(/ახალი ადამიანის დამატება/);
        expect(link).toHaveAttribute("href", "/mdItemEdit/Humans");
        expect(link).toHaveAttribute("target", "_blank");
    });
});
