//Salary.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    captureDownloads,
    createSalaryStore,
    mockFetchFiles,
    renderSalaryOnRoute,
    salaryHeaderRow,
    type FileReply,
} from "../testUtils/salaryTestStore";
import { previousMonthInputValue } from "./salaryForm";
import Salary from "./Salary";

afterEach(() => {
    vi.restoreAllMocks();
});

function renderList(menu: MenuState = "withRight") {
    const store = createSalaryStore(menu);
    renderSalaryOnRoute(<Salary />, store, "/salary", "/salary");
    return store;
}

const monthInput = () => screen.getByLabelText("დეკლარაციის თვე") as HTMLInputElement;
const declarationButton = () =>
    screen.getByRole("button", { name: /დეკლარაციის ფაილის მომზადება/ }) as HTMLButtonElement;

describe("Salary", () => {
    it("lists the headers with their dates, line counts and net sums", async () => {
        mockFetch(() => ({
            status: 200,
            body: [salaryHeaderRow(), salaryHeaderRow({ shId: 3, shChargeDate: "2026-11-05T00:00:00", linesCount: 0, amountNetSum: 0 })],
        }));
        renderList();

        const rows = within((await screen.findAllByRole("table"))[0]).getAllByRole("row");
        expect(rows.map((r) => Array.from(r.querySelectorAll("th,td")).map((c) => c.textContent))).toEqual([
            ["დარიცხვის თარიღი", "გადარიცხვის თარიღი", "სტრიქონები", "გადასარიცხი"],
            ["05.10.2026", "04.10.2026", "2", "3771.44"],
            ["05.11.2026", "04.10.2026", "0", "0.00"],
        ]);
        expect(screen.getByRole("link", { name: "05.10.2026" })).toHaveAttribute("href", "/salaryEdit/2");
        expect(screen.getByRole("link", { name: /ახალი უწყისი/ })).toHaveAttribute("href", "/salaryEdit");
    });

    it("says when there are no headers", async () => {
        mockFetch(() => ({ status: 200, body: [] }));
        renderList();

        expect(await screen.findByText("უწყისები არ არის")).toBeInTheDocument();
    });

    it("does not load without the right", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [] }));
        const store = renderList("withoutRight");

        expect(await screen.findByText("ხელფასების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().salaryApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("waits while the menu loads", () => {
        const calls = mockFetch(() => ({ status: 200, body: [] }));
        const store = renderList("loading");

        expect(screen.queryByText("ხელფასები")).not.toBeInTheDocument();
        expect(store.getState().salaryApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("shows a load error", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Boom", detail: "server failed", status: 500 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    it("downloads the declaration of the previous month by default", async () => {
        const saved = captureDownloads();
        const calls = mockFetchFiles((call) =>
            call.url.endsWith("/headers")
                ? { status: 200, text: JSON.stringify([salaryHeaderRow()]), headers: { "Content-Type": "application/json" } }
                : { status: 200, text: "x" }
        );
        renderList();
        await screen.findByText("05.10.2026");

        expect(monthInput()).toHaveValue(previousMonthInputValue());
        fireEvent.change(monthInput(), { target: { value: "2026-09" } });
        fireEvent.click(declarationButton());

        await waitFor(() => expect(saved.map((s) => s.fileName)).toEqual(["TaxDepDeclaration_2026_9.csv"]));
        expect(calls[1].url.endsWith("/salary/declarationfile?month=2026-09-01")).toBe(true);
    });

    it("cannot download without a month", async () => {
        mockFetch(() => ({ status: 200, body: [] }));
        renderList();
        await screen.findByText("უწყისები არ არის");

        fireEvent.change(monthInput(), { target: { value: "" } });

        expect(declarationButton()).toBeDisabled();
    });

    // the headers as JSON; the declaration files reply in turn, a missing reply never arrives
    function serveDeclarations(...replies: FileReply[]) {
        let next = 0;
        return mockFetchFiles((call) => {
            if (call.url.endsWith("/headers"))
                return { status: 200, text: JSON.stringify([salaryHeaderRow()]), headers: { "Content-Type": "application/json" } };
            return next < replies.length ? replies[next++] : new Promise<FileReply>(() => undefined);
        });
    }

    const refusedFile: FileReply = {
        status: 400,
        text: JSON.stringify({ title: "DeclarationMonthIsRequired", detail: "refused", status: 400 }),
        headers: { "Content-Type": "application/json" },
    };

    it("shows the spinner on the download button only while downloading", async () => {
        serveDeclarations();
        renderList();
        await screen.findByText("05.10.2026");
        expect(declarationButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.click(declarationButton());

        await waitFor(() => expect(declarationButton()).toBeDisabled());
        expect(declarationButton().querySelector(".spinner-border")).not.toBeNull();
    });

    it("clears the old error when downloading again", async () => {
        serveDeclarations(refusedFile);
        renderList();
        await screen.findByText("05.10.2026");
        fireEvent.click(declarationButton());
        await screen.findByText("refused");

        fireEvent.click(declarationButton());

        await waitFor(() => expect(declarationButton()).toBeDisabled());
        expect(screen.queryByText("refused")).not.toBeInTheDocument();
    });

    // the page downloads the file itself; the browser must not submit the form
    it("keeps the browser from submitting the form", async () => {
        serveDeclarations();
        renderList();
        await screen.findByText("05.10.2026");
        const form = declarationButton().closest("form")!;

        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    // an error left by another page is not shown here
    it("clears an old mutation error when it opens", async () => {
        mockFetch(() => ({ status: 200, body: [] }));
        const store = createSalaryStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderSalaryOnRoute(<Salary />, store, "/salary", "/salary");

        await screen.findByText("უწყისები არ არის");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
        expect(store.getState().alertState.alert.ApiMutation ?? []).toEqual([]);
    });

    it("shows a failed download", async () => {
        captureDownloads();
        mockFetchFiles((call) =>
            call.url.endsWith("/headers")
                ? { status: 200, text: "[]", headers: { "Content-Type": "application/json" } }
                : {
                      status: 400,
                      text: JSON.stringify({ title: "DeclarationMonthIsRequired", detail: "no month", status: 400 }),
                  }
        );
        renderList();
        await screen.findByText("უწყისები არ არის");

        fireEvent.click(declarationButton());

        expect(await screen.findByText(/no month|DeclarationMonthIsRequired/)).toBeInTheDocument();
    });
});
