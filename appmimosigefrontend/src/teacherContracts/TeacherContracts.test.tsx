//TeacherContracts.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import {
    decodeFilterSortRequest,
    type MenuState,
} from "../testUtils/studentContractsTestStore";
import {
    createTeacherContractsStore,
    renderTeacherOnRoute,
} from "../testUtils/teacherContractsTestStore";
import type { ITeacherContractRow } from "../redux/types/teacherContractsTypes";
import TeacherContracts from "./TeacherContracts";

const row: ITeacherContractRow = {
    id: 7,
    contractNumber: "T3.07",
    contractDate: "2025-09-01T00:00:00",
    teacherHumanId: 1,
    teacherName: "Alpha Ann",
    salarySchemeName: "Senior",
    pensionScheme: true,
    indEnt: false,
    fixedAmount: 850.5,
    contractEndDate: "2027-06-30T00:00:00",
};

function serve(
    rows: FetchReply = { status: 200, body: { allRowsCount: 1, offset: 0, rows: [row] } }
): FetchCall[] {
    return mockFetch(() => rows);
}

function renderList(menu: MenuState = "withRight") {
    return renderTeacherOnRoute(
        <TeacherContracts />,
        createTeacherContractsStore(menu),
        "/list",
        "/list"
    );
}

function rowsRequests(calls: FetchCall[]) {
    return calls
        .filter((c) => c.url.includes("/teachercontracts/rowsdata"))
        .map((c) => decodeFilterSortRequest(c.url));
}

function lastRowsRequest(calls: FetchCall[]) {
    const requests = rowsRequests(calls);
    return requests[requests.length - 1];
}

// lets started requests reach the mocked fetch
async function flush() {
    for (let i = 0; i < 5; i++) await act(async () => {});
}

describe("TeacherContracts", () => {
    it("tells a user without the menu right that the list is not available", async () => {
        const calls = serve();

        renderList("withoutRight");
        await flush();

        expect(
            screen.getByText("მასწავლებლების კონტრაქტების ნახვის უფლება არ გაქვთ")
        ).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the menu before loading anything", async () => {
        const calls = serve();

        renderList("loading");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("lists the active contracts with their columns", async () => {
        const calls = serve();

        renderList();

        const link = await screen.findByRole("link", { name: "T3.07" });
        expect(link).toHaveAttribute("href", "/teacherContractEdit/7");
        const cells = within(link.closest("tr")!)
            .getAllByRole("cell")
            .map((cell) => cell.textContent);
        // row number, number, date, employee, scheme, pension, ind. entrepreneur, amount, end date
        expect(cells).toEqual(
            ["1", "T3.07", "01.09.2025", "Alpha Ann", "Senior", "✓", "", "850.50", "30.06.2027"]
        );
        for (const caption of [
            "კ. N",
            "თარიღი",
            "თანამშრომელი",
            "ხელფასის სქემა",
            "საპენსიო",
            "ინდ. მეწარმე",
            "ფიქს. თანხა",
            "დასრულება",
        ])
            expect(
                screen.getByRole("link", { name: new RegExp(caption.replace(".", "\\.")) })
            ).toBeInTheDocument();
        expect(screen.queryByText("ID")).not.toBeInTheDocument();
        expect(screen.getByLabelText("კონტრაქტები")).toHaveValue("active");
        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([
                { fieldName: "activeOnly", value: "true" },
            ])
        );
    });

    it("shows empty cells for a missing scheme, amount and end date", async () => {
        serve({
            status: 200,
            body: {
                allRowsCount: 1,
                offset: 0,
                rows: [
                    {
                        ...row,
                        salarySchemeName: null,
                        pensionScheme: false,
                        fixedAmount: 0,
                        contractEndDate: null,
                    },
                ],
            },
        });

        renderList();

        const link = await screen.findByRole("link", { name: "T3.07" });
        const cells = within(link.closest("tr")!)
            .getAllByRole("cell")
            .map((cell) => cell.textContent);
        expect(cells).toEqual(["1", "T3.07", "01.09.2025", "Alpha Ann", "", "", "", "", ""]);
    });

    it("offers a link to a new contract", async () => {
        serve();

        renderList();

        expect(await screen.findByRole("link", { name: /ახალი/ })).toHaveAttribute(
            "href",
            "/teacherContractEdit"
        );
    });

    it("reloads every contract from the first page with the search text", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });

        fireEvent.change(screen.getByLabelText("კონტრაქტები"), {
            target: { value: "all" },
        });
        fireEvent.change(screen.getByLabelText("ძებნა"), {
            target: { value: " ალფა " },
        });

        await waitFor(() =>
            expect(lastRowsRequest(calls)).toMatchObject({
                offset: 0,
                filterFields: [{ fieldName: "search", value: "ალფა" }],
            })
        );
        expect(screen.getByLabelText("კონტრაქტები")).toHaveValue("all");
    });

    it("goes back to the active contracts when they are chosen again", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });
        const filter = screen.getByLabelText("კონტრაქტები");
        fireEvent.change(filter, { target: { value: "all" } });
        await waitFor(() => expect(lastRowsRequest(calls)?.filterFields).toEqual([]));

        fireEvent.change(filter, { target: { value: "active" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([
                { fieldName: "activeOnly", value: "true" },
            ])
        );
        expect(filter).toHaveValue("active");
    });

    describe("with fake timers", () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        // runs the search pause timer and lets the mocked fetch and the re-render finish
        const settle = (ms = 1000) => act(() => vi.advanceTimersByTimeAsync(ms));

        it("loads nothing for a user without the right, even after the search pause", async () => {
            const calls = serve();

            renderList("withoutRight");
            await settle();

            expect(calls).toHaveLength(0);
        });

        it("loads nothing while the menu is loading, even after the search pause", async () => {
            const calls = serve();

            renderList("loading");
            await settle();

            expect(calls).toHaveLength(0);
        });
    });

    it("sorts by the individual entrepreneur column", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });

        fireEvent.click(screen.getByRole("link", { name: /ინდ\. მეწარმე/ }));

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.sortByFields).toEqual([
                { fieldName: "indEnt", ascending: true },
            ])
        );
    });

    it("sends the sort order chosen in the grid", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });

        fireEvent.click(screen.getByRole("link", { name: /ფიქს\. თანხა/ }));

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.sortByFields).toEqual([
                { fieldName: "fixedAmount", ascending: true },
            ])
        );
        expect(lastRowsRequest(calls)?.filterFields).toEqual([
            { fieldName: "activeOnly", value: "true" },
        ]);
    });

    it("searches only for the text typed last", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });

        fireEvent.change(screen.getByLabelText("ძებნა"), { target: { value: "a" } });
        fireEvent.change(screen.getByLabelText("ძებნა"), { target: { value: "al" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toContainEqual({ fieldName: "search", value: "al" })
        );
        expect(
            rowsRequests(calls).some((r) => r.filterFields.some((f) => f.value === "a"))
        ).toBe(false);
    });

    it("does not submit the filter form (Enter in the search box)", async () => {
        serve();
        renderList();
        await screen.findByRole("link", { name: "T3.07" });

        const form = screen.getByLabelText("ძებნა").closest("form")!;

        expect(fireEvent.submit(form)).toBe(false);
    });

    it("shows the load error", async () => {
        serve({ status: 500, body: { title: "x", status: 500 } });

        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
