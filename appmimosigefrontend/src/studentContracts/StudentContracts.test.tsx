//StudentContracts.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import {
    createStudentContractsStore,
    decodeFilterSortRequest,
    renderOnRoute,
    type MenuState,
} from "../testUtils/studentContractsTestStore";
import type { IStudentContractFormLookups } from "../redux/types/studentContractsTypes";
import StudentContracts from "./StudentContracts";

const lookups: IStudentContractFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    studentStatuses: [
        { id: 2, name: "II class" },
        { id: 9, name: "IX class" },
    ],
    courses: [],
    groupSizes: [],
};

const row = {
    scId: 7,
    contractNumber: "6.007",
    contractDate: "2026-09-01T00:00:00",
    studentHumanId: 1,
    studentName: "Alpha Ann",
    payerHumanId: 2,
    payerName: "Beta Bob",
    academicYearId: 11,
    academicYearName: "2026-2027",
    studentStatusId: 9,
    studentStatusName: "IX class",
    desiredMonthlyPaymentDay: 15,
};

function serve(
    formLookups: FetchReply = { status: 200, body: lookups }
): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return formLookups;
        return {
            status: 200,
            body: { allRowsCount: 1, offset: 0, rows: [row] },
        };
    });
}

function renderList(menu: MenuState = "withRight") {
    return renderOnRoute(
        <StudentContracts />,
        createStudentContractsStore(menu),
        "/list",
        "/list"
    );
}

function rowsRequests(calls: FetchCall[]) {
    return calls
        .filter((c) => c.url.includes("/rowsdata"))
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

describe("StudentContracts", () => {
    it("tells a user without the menu right that the list is not available", async () => {
        const calls = serve();

        renderList("withoutRight");
        await flush();

        expect(
            screen.getByText("მოსწავლეების კონტრაქტების ნახვის უფლება არ გაქვთ")
        ).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("shows the loading indicator until the lookups arrive", async () => {
        mockFetch(() => new Promise<FetchReply>(() => {}));

        renderList();
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
    });

    it("shows the Access column captions and hides the id column", async () => {
        serve();

        renderList();
        await screen.findByRole("link", { name: "6.007" });

        for (const caption of [
            "კ. N",
            "თარიღი",
            "მოსწავლე",
            "გადამხდელი",
            "სასწ. წელი",
            "მოსწ. სტატ.",
            "გადახდის სასურველი დღე",
        ])
            expect(screen.getByRole("link", { name: new RegExp(caption.replace(".", "\\.")) })).toBeInTheDocument();
        expect(screen.queryByText("ID")).not.toBeInTheDocument();
    });

    it("searches only for the text typed last", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "6.007" });

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
        await screen.findByRole("link", { name: "6.007" });

        const form = screen.getByLabelText("ძებნა").closest("form")!;

        expect(fireEvent.submit(form)).toBe(false);
    });

    it("waits for the menu before loading anything", async () => {
        const calls = serve();

        renderList("loading");
        await flush();

        expect(screen.queryByText("მოსწავლეების კონტრაქტები")).not.toBeInTheDocument();
        expect(screen.queryByText(/ნახვის უფლება არ გაქვთ/)).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("lists the contracts of the current academic year", async () => {
        const calls = serve();

        renderList();

        const link = await screen.findByRole("link", { name: "6.007" });
        expect(link).toHaveAttribute("href", "/studentContractEdit/7");
        const cells = within(link.closest("tr")!)
            .getAllByRole("cell")
            .map((cell) => cell.textContent);
        expect(cells).toEqual(
            expect.arrayContaining(["01.09.2026", "Alpha Ann", "Beta Bob", "2026-2027", "IX class", "15"])
        );
        expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("11");
        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([
                { fieldName: "academicYearId", value: "11" },
            ])
        );
    });

    it("offers a link to a new contract", async () => {
        serve();

        renderList();

        expect(await screen.findByRole("link", { name: /ახალი/ })).toHaveAttribute(
            "href",
            "/studentContractEdit"
        );
    });

    it("reloads from the first page with the chosen status and search text", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "6.007" });

        fireEvent.change(screen.getByLabelText("მოსწავლის სტატუსი"), {
            target: { value: "9" },
        });
        fireEvent.change(screen.getByLabelText("ძებნა"), {
            target: { value: " ალფა " },
        });

        await waitFor(() =>
            expect(lastRowsRequest(calls)).toMatchObject({
                offset: 0,
                filterFields: [
                    { fieldName: "academicYearId", value: "11" },
                    { fieldName: "studentStatusId", value: "9" },
                    { fieldName: "search", value: "ალფა" },
                ],
            })
        );
    });

    it("drops the year filter when all years are chosen", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "6.007" });

        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), {
            target: { value: "" },
        });

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([])
        );
    });

    it("lists every year when there is no current one", async () => {
        const calls = serve({
            status: 200,
            body: { ...lookups, currentAcademicYearId: null },
        });

        renderList();

        await screen.findByRole("link", { name: "6.007" });
        expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("");
        expect(rowsRequests(calls).every((r) => r.filterFields.length === 0)).toBe(true);
    });

    it("sends the sort order chosen in the grid", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "6.007" });

        fireEvent.click(screen.getByRole("link", { name: /თარიღი/ }));

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.sortByFields).toEqual([
                { fieldName: "contractDate", ascending: true },
            ])
        );
        // the grid keeps the filters of the page
        expect(lastRowsRequest(calls)?.filterFields).toEqual([
            { fieldName: "academicYearId", value: "11" },
        ]);
    });

    it("shows the load error", async () => {
        serve({ status: 500, body: { title: "x", status: 500 } });

        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
