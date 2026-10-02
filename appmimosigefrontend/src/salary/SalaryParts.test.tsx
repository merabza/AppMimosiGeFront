//SalaryParts.test.tsx

import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { createSalaryStore, salaryHeaderData, salaryLookups, salaryPart } from "../testUtils/salaryTestStore";
import type { ISalaryPart } from "../redux/types/salaryTypes";
import SalaryParts from "./SalaryParts";

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

const refused = { status: 400, body: { title: "DeductionMustBePositive", detail: "refused", status: 400 } };

// the calculated part 20 of employee 1, the manual part 21 of employee 5 and a manual part 23 of employee 1
const parts: ISalaryPart[] = [
    ...salaryHeaderData().parts,
    salaryPart({ spId: 23, teacherContractId: 1, employeeName: "Alpha Ann / T3.01", spAmount: 50 }),
];

function renderParts(change: ChangeReply = () => ({ status: 200, body: 9 }), shown: ISalaryPart[] = parts) {
    const calls = mockFetch(change);
    const store = createSalaryStore();
    render(
        <Provider store={store}>
            <SalaryParts shId={2} parts={shown} lookups={salaryLookups} />
        </Provider>
    );
    return { calls, store };
}

// the change replies in turn; a missing one never arrives
function replies(...answers: FetchReply[]): ChangeReply {
    let next = 0;
    return () => (next < answers.length ? answers[next++] : new Promise<FetchReply>(() => undefined));
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const partForm = () => screen.getByRole("form", { name: "მდგენელი" });
const saveButton = () => within(partForm()).getByRole("button", { name: /შენახვა/ }) as HTMLButtonElement;
const addButton = () => screen.getByRole("button", { name: /მდგენელის დამატება/ }) as HTMLButtonElement;
//the rows follow the parts (the first row is the header)
const row = (spId: number) => screen.getAllByRole("row")[parts.findIndex((p) => p.spId === spId) + 1];
const mutationErrors = (store: ReturnType<typeof createSalaryStore>) =>
    store.getState().alertState.alert.ApiMutation ?? [];
const hint = "გამოქვითვა დადებითი თანხით იწერება";

function fillNewPart(typeId: string, amount: string) {
    fireEvent.click(addButton());
    fireEvent.change(field("თანამშრომელი"), { target: { value: "1" } });
    fireEvent.change(field("ტიპი"), { target: { value: typeId } });
    fireEvent.change(field("თანხა"), { target: { value: amount } });
}

describe("SalaryParts", () => {
    it("shows an empty type for a part without one", () => {
        renderParts(undefined, [salaryPart({ salaryPartTypeId: null, salaryPartTypeName: null })]);

        expect(Array.from(screen.getAllByRole("row")[1].children).map((c) => c.textContent)).toEqual([
            "Beta Bob / T3.05",
            "",
            "800.00",
            "",
        ]);
    });

    it("offers no second new part while one is being added", () => {
        renderParts();
        expect(addButton()).toBeEnabled();

        fireEvent.click(addButton());

        expect(addButton()).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: /გაუქმება/ }));
        expect(addButton()).toBeEnabled();
    });

    it("marks the row being edited", () => {
        renderParts();

        fireEvent.click(within(row(21)).getByTitle("მდგენელის შეცვლა"));

        expect(row(21)).toHaveClass("table-active");
        expect(row(23)).not.toHaveClass("table-active");
        expect(row(20)).not.toHaveClass("table-active");
    });

    it("shows the deduction hint only for a valid deduction", () => {
        renderParts();

        fillNewPart("3", "5");
        expect(screen.getAllByText(hint)).toHaveLength(1);
        fireEvent.change(field("ტიპი"), { target: { value: "4" } });
        expect(screen.getAllByText(hint)).toHaveLength(2);
        fireEvent.change(field("თანხა"), { target: { value: "-5" } });
        expect(screen.getAllByText(hint)).toHaveLength(1);
        expect(field("თანხა")).toHaveClass("is-invalid");
    });

    it("clears an old error when an edit starts", () => {
        const { store } = renderParts();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));

        fireEvent.click(addButton());

        expect(mutationErrors(store)).toEqual([]);
    });

    describe("saving", () => {
        it("shows the spinner on the save button while a new part is created", async () => {
            renderParts(replies());
            fillNewPart("3", "5");
            expect(saveButton().querySelector(".spinner-border")).toBeNull();

            fireEvent.click(saveButton());

            await waitFor(() => expect(saveButton()).toBeDisabled());
            expect(saveButton().querySelector(".spinner-border")).not.toBeNull();
        });

        it("shows the spinner on the save button while a part is changed", async () => {
            const { calls } = renderParts(replies());
            fireEvent.click(within(row(21)).getByTitle("მდგენელის შეცვლა"));

            fireEvent.click(saveButton());

            await waitFor(() => expect(saveButton()).toBeDisabled());
            expect(saveButton().querySelector(".spinner-border")).not.toBeNull();
            expect(calls.map((c) => c.method)).toEqual(["PUT"]);
        });

        it("clears the old error when saving again", async () => {
            const { store } = renderParts(replies(refused));
            fillNewPart("3", "5");
            fireEvent.click(saveButton());
            await waitFor(() => expect(mutationErrors(store)).toHaveLength(1));

            fireEvent.click(saveButton());

            await waitFor(() => expect(saveButton()).toBeDisabled());
            expect(mutationErrors(store)).toEqual([]);
        });

        it("keeps the form open when the save is refused", async () => {
            const { store } = renderParts(replies(refused));
            fillNewPart("3", "5");

            fireEvent.click(saveButton());

            await waitFor(() => expect(mutationErrors(store)).toHaveLength(1));
            expect(field("თანხა")).toHaveValue(5);
        });

        // the page sends the part itself; the browser must not submit the form
        it("keeps the browser from submitting the form", () => {
            renderParts(replies());
            fillNewPart("3", "5");

            const submit = createEvent.submit(partForm());
            fireEvent(partForm(), submit);

            expect(submit.defaultPrevented).toBe(true);
        });
    });

    describe("deleting", () => {
        async function deleteRow(spId: number) {
            fireEvent.click(within(row(spId)).getByTitle("მდგენელის წაშლა"));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
        }

        it("asks with the part's employee, type and amount", async () => {
            renderParts();

            fireEvent.click(within(row(21)).getByTitle("მდგენელის წაშლა"));

            expect(
                await screen.findByText("დარწმუნებული ხართ, რომ გსურთ წაშალოთ მდგენელი: Beta Bob / T3.05, დანამატი, 800.00?")
            ).toBeInTheDocument();
        });

        it("closes the form when the edited part is deleted", async () => {
            renderParts();
            fireEvent.click(within(row(21)).getByTitle("მდგენელის შეცვლა"));

            await deleteRow(21);

            await waitFor(() => expect(screen.queryByRole("form", { name: "მდგენელი" })).not.toBeInTheDocument());
        });

        it("keeps the form open when another part is deleted", async () => {
            const { calls } = renderParts();
            fireEvent.click(within(row(23)).getByTitle("მდგენელის შეცვლა"));

            await deleteRow(21);

            await waitFor(() => expect(calls.map((c) => [c.method, c.url.split("/api/v1")[1]])).toEqual([
                ["DELETE", "/salary/parts/21"],
            ]));
            //the deletion's own render happens after the reply
            await waitFor(() => expect(screen.queryByRole("button", { name: "დიახ" })).not.toBeInTheDocument());
            expect(field("თანხა")).toHaveValue(50);
        });

        it("asks again after the deletion was declined", async () => {
            const { calls } = renderParts();
            fireEvent.click(within(row(21)).getByTitle("მდგენელის წაშლა"));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));
            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());

            fireEvent.click(within(row(21)).getByTitle("მდგენელის წაშლა"));

            expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
            expect(calls).toEqual([]);
        });

        it("asks again after a refused deletion", async () => {
            const { store } = renderParts(replies(refused));
            await deleteRow(21);
            await waitFor(() => expect(mutationErrors(store)).toHaveLength(1));

            fireEvent.click(within(row(21)).getByTitle("მდგენელის წაშლა"));

            expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
        });

        it("clears the old error when deleting again", async () => {
            const { store, calls } = renderParts(replies(refused));
            await deleteRow(21);
            await waitFor(() => expect(mutationErrors(store)).toHaveLength(1));

            await deleteRow(21);

            await waitFor(() => expect(calls).toHaveLength(2));
            expect(mutationErrors(store)).toEqual([]);
        });
    });
});
