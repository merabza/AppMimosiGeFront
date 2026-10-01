//StudentContractPicker.test.tsx

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import {
    createPaymentsStore,
    paymentLookups,
    requestedYear,
    yearContracts,
} from "../testUtils/paymentsTestStore";
import StudentContractPicker from "./StudentContractPicker";

type HarnessProps = {
    year?: string;
    contract?: string;
    required?: boolean;
    disabled?: boolean;
    contractName?: string;
    onSubmit?: () => void;
};

// the picker in a form whose parent keeps the year and the contract, as the payment form and the list filter do
function Harness(props: HarnessProps) {
    const [year, setYear] = useState(props.year ?? "11");
    const [contract, setContract] = useState(props.contract ?? "");
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                props.onSubmit?.();
            }}
        >
            <StudentContractPicker
                id="picker"
                label="მოსწავლე"
                academicYears={paymentLookups.academicYears}
                academicYearId={year}
                studentContractId={contract}
                contractName={props.contractName}
                required={props.required}
                disabled={props.disabled}
                onYearChange={(yearId) => {
                    setYear(yearId);
                    setContract("");
                }}
                onContractChange={setContract}
            />
            <div data-testid="contract">{contract}</div>
            <button type="submit">save</button>
        </form>
    );
}

function serve(reply?: (call: FetchCall) => FetchReply | Promise<FetchReply>): FetchCall[] {
    return mockFetch(
        reply ?? ((call) => ({ status: 200, body: yearContracts[requestedYear(call.url)] ?? [] }))
    );
}

function renderPicker(props: HarnessProps = {}) {
    return render(
        <Provider store={createPaymentsStore()}>
            <Harness {...props} />
        </Provider>
    );
}

const input = () => screen.getByLabelText("მოსწავლე") as HTMLInputElement;
const yearSelect = () => screen.getByLabelText("მოსწავლე: სასწავლო წელი");
const options = () => screen.queryAllByRole("button", { name: /6\.00/ }).map((o) => o.textContent);

async function openList() {
    fireEvent.focus(input());
    await waitFor(() => expect(screen.queryByText("იტვირთება...")).not.toBeInTheDocument());
}

describe("StudentContractPicker", () => {
    it("loads the contracts of the year and shows the chosen one", async () => {
        const calls = serve();
        renderPicker({ contract: "11" });

        await waitFor(() => expect(input()).toHaveValue("Beta Bob 6.002"));
        expect(calls.map((c) => requestedYear(c.url))).toEqual([11]);
        expect(yearSelect()).toHaveValue("11");
    });

    it("lists the academic years", () => {
        serve();
        renderPicker();

        expect(
            Array.from((yearSelect() as HTMLSelectElement).options).map((o) => o.textContent)
        ).toEqual(["2025-2026", "2026-2027"]);
    });

    it("lists every contract of the year when the search starts", async () => {
        serve();
        renderPicker();

        await openList();

        expect(options()).toEqual(["Alpha Ann 6.001", "Beta Bob 6.002", "Gamma Gia 6.003"]);
        expect(input()).toHaveValue("");
    });

    it("narrows the list by the typed words and picks a contract", async () => {
        serve();
        renderPicker();
        await openList();

        fireEvent.change(input(), { target: { value: "gia gamma" } });
        expect(options()).toEqual(["Gamma Gia 6.003"]);
        fireEvent.mouseDown(screen.getByText("Gamma Gia 6.003"));

        expect(screen.getByTestId("contract").textContent).toBe("13");
        expect(input()).toHaveValue("Gamma Gia 6.003");
        expect(options()).toEqual([]);
    });

    it("tells when nothing is found", async () => {
        serve();
        renderPicker();
        await openList();

        fireEvent.change(input(), { target: { value: "nobody" } });

        expect(screen.getByText("ვერ მოიძებნა")).toBeInTheDocument();
    });

    it("shows that the contracts are loading", async () => {
        serve(() => new Promise<FetchReply>(() => {}));
        renderPicker();

        fireEvent.focus(input());

        expect(await screen.findByText("იტვირთება...")).toBeInTheDocument();
        expect(screen.queryByText("ვერ მოიძებნა")).not.toBeInTheDocument();
    });

    // Enter never saves the form; it picks the only match
    it("picks the only match with Enter without submitting", async () => {
        serve();
        const onSubmit = vi.fn();
        renderPicker({ onSubmit });
        await openList();

        fireEvent.change(input(), { target: { value: "beta" } });
        fireEvent.keyDown(input(), { key: "Enter" });

        expect(screen.getByTestId("contract").textContent).toBe("11");
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("picks nothing with Enter when several contracts match", async () => {
        serve();
        renderPicker();
        await openList();

        fireEvent.change(input(), { target: { value: "6.00" } });
        const notCancelled = fireEvent.keyDown(input(), { key: "Enter" });

        expect(notCancelled).toBe(false);
        expect(screen.getByTestId("contract").textContent).toBe("");
        expect(options()).toHaveLength(3);
    });

    it("leaves other keys to the input", async () => {
        serve();
        renderPicker();
        await openList();

        fireEvent.change(input(), { target: { value: "beta" } });
        const notCancelled = fireEvent.keyDown(input(), { key: "ArrowDown" });

        expect(notCancelled).toBe(true);
        expect(screen.getByTestId("contract").textContent).toBe("");
    });

    // after a choice the input keeps the focus: typing starts a new search
    it("starts a new search when typing after a choice", async () => {
        serve();
        renderPicker();
        await openList();
        fireEvent.mouseDown(screen.getByText("Alpha Ann 6.001"));

        fireEvent.change(input(), { target: { value: "beta" } });

        expect(input()).toHaveValue("beta");
        expect(options()).toEqual(["Beta Bob 6.002"]);
    });

    it("closes the list a moment after the input loses the focus", async () => {
        serve();
        renderPicker({ contract: "10" });
        await openList();
        vi.useFakeTimers();
        try {
            fireEvent.blur(input());
            expect(options()).toHaveLength(3);

            act(() => vi.advanceTimersByTime(200));

            expect(options()).toEqual([]);
            expect(input()).toHaveValue("Alpha Ann 6.001");
        } finally {
            vi.useRealTimers();
        }
    });

    it("clears the chosen contract when the year changes and loads that year", async () => {
        const calls = serve();
        renderPicker({ contract: "10" });
        await waitFor(() => expect(input()).toHaveValue("Alpha Ann 6.001"));

        fireEvent.change(yearSelect(), { target: { value: "10" } });

        expect(screen.getByTestId("contract").textContent).toBe("");
        expect(input()).toHaveValue("");
        await waitFor(() => expect(calls.map((c) => requestedYear(c.url))).toEqual([11, 10]));
        await openList();
        expect(options()).toEqual(["Gamma Gia 6.001"]);
    });

    // an opened payment shows its contract before the year's contracts arrive
    it("shows the given name while the contracts load", () => {
        serve(() => new Promise<FetchReply>(() => {}));
        renderPicker({ contract: "10", contractName: "Alpha Ann 6.001 (saved)" });

        expect(input()).toHaveValue("Alpha Ann 6.001 (saved)");
    });

    it("shows no name when no contract is chosen, even with a given name", () => {
        serve();
        renderPicker({ contractName: "Alpha Ann 6.001" });

        expect(input()).toHaveValue("");
    });

    it("loads nothing without a year", () => {
        const calls = serve();
        renderPicker({ year: "" });

        expect(calls).toHaveLength(0);
    });

    describe("when required", () => {
        it("marks the empty choice invalid and stops the form", async () => {
            serve();
            const onSubmit = vi.fn();
            renderPicker({ required: true, onSubmit });

            expect(input()).toHaveClass("is-invalid");
            expect(input().validationMessage).toBe("აირჩიეთ მოსწავლის კონტრაქტი");
            fireEvent.click(screen.getByRole("button", { name: "save" }));
            expect(onSubmit).not.toHaveBeenCalled();
        });

        it("lets the form go after a choice", async () => {
            serve();
            const onSubmit = vi.fn();
            renderPicker({ required: true, onSubmit });
            await openList();
            fireEvent.mouseDown(screen.getByText("Beta Bob 6.002"));

            expect(input()).not.toHaveClass("is-invalid");
            expect(input().validationMessage).toBe("");
            fireEvent.click(screen.getByRole("button", { name: "save" }));
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });

        // while searching the field is not marked: the choice is still being made
        it("does not mark the field while searching", async () => {
            serve();
            renderPicker({ required: true });

            await openList();

            expect(input()).not.toHaveClass("is-invalid");
        });

        it("offers no clearing", async () => {
            serve();
            renderPicker({ required: true, contract: "10" });

            await waitFor(() => expect(input()).toHaveValue("Alpha Ann 6.001"));
            expect(screen.queryByTitle("მოსწავლის ფილტრის მოხსნა")).not.toBeInTheDocument();
        });
    });

    describe("as a filter", () => {
        it("is not invalid when empty", () => {
            serve();
            renderPicker();

            expect(input()).not.toHaveClass("is-invalid");
            expect(input().validationMessage).toBe("");
        });

        it("clears the chosen contract", async () => {
            serve();
            renderPicker({ contract: "10" });

            fireEvent.click(await screen.findByTitle("მოსწავლის ფილტრის მოხსნა"));

            expect(screen.getByTestId("contract").textContent).toBe("");
            expect(screen.queryByTitle("მოსწავლის ფილტრის მოხსნა")).not.toBeInTheDocument();
        });

        it("offers no clearing when nothing is chosen", () => {
            serve();
            renderPicker();

            expect(screen.queryByTitle("მოსწავლის ფილტრის მოხსნა")).not.toBeInTheDocument();
        });
    });

    it("disables the year, the search and the clearing", async () => {
        serve();
        renderPicker({ contract: "10", disabled: true });

        expect(yearSelect()).toBeDisabled();
        expect(input()).toBeDisabled();
        expect(await screen.findByTitle("მოსწავლის ფილტრის მოხსნა")).toBeDisabled();
    });
});
