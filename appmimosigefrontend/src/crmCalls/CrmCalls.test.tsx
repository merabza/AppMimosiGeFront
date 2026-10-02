//CrmCalls.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { decodeFilterSortRequest, type MenuState } from "../testUtils/studentContractsTestStore";
import { requestedYear } from "../testUtils/paymentsTestStore";
import {
    createCrmCallsStore,
    crmCallLookups,
    crmCallRow,
    crmYearContracts,
    renderCrmCallsOnRoute,
} from "../testUtils/crmCallsTestStore";
import CrmCalls from "./CrmCalls";

const rows = { allRowsCount: 1, offset: 0, rows: [crmCallRow()] };

function serve(rowsReply: () => FetchReply | Promise<FetchReply> = () => ({ status: 200, body: rows })): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: crmCallLookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: crmYearContracts[requestedYear(call.url)] ?? [] };
        return rowsReply();
    });
}

function renderList(url = "/crmCalls", menu: MenuState = "withRight") {
    const store = createCrmCallsStore(menu);
    renderCrmCallsOnRoute(<CrmCalls />, store, "/crmCalls", url);
    return store;
}

function rowsRequests(calls: FetchCall[]) {
    return calls.filter((c) => c.url.includes("/crmcalls/rowsdata")).map((c) => decodeFilterSortRequest(c.url));
}

function lastRowsRequest(calls: FetchCall[]) {
    const requests = rowsRequests(calls);
    return requests[requests.length - 1];
}

function filterValue(calls: FetchCall[], fieldName: string) {
    return lastRowsRequest(calls).filterFields.find((f) => f.fieldName === fieldName)?.value;
}

const location = () => screen.getByTestId("location").textContent ?? "";
const studentInput = () => screen.getByLabelText("მოსწავლე");
const firstCallLink = () => screen.findByRole("link", { name: "24.09.2026 19:48" });

describe("CrmCalls", () => {
    // Access listed every call in the form's own order (the server's default)
    it("lists every call without a filter and in the default order", async () => {
        const calls = serve();
        renderList();

        await firstCallLink();
        expect(lastRowsRequest(calls).filterFields).toEqual([]);
        expect(lastRowsRequest(calls).sortByFields).toEqual([]);
    });

    it("shows the date, the student, the type, the result, the conversation and the must pay date", async () => {
        serve();
        renderList();

        const link = await firstCallLink();
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(1)).toEqual([
            "24.09.2026 19:48",
            "Alpha Ann / 6.001",
            "Reminder",
            "Answered",
            "will pay next week",
            "08.10.2026",
        ]);
    });

    it("titles the list", async () => {
        serve();
        renderList();

        expect(await screen.findByRole("heading", { name: "CRM ზარები" })).toBeInTheDocument();
    });

    // the lookups arrived but the calls did not
    it("tells when the calls fail to load", async () => {
        serve(() => ({ status: 400, body: { title: "FilterSortRequestIsInvalid", detail: "bad filter", status: 400 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getByText("bad filter")).toBeInTheDocument();
        expect(screen.queryByLabelText("შედეგი")).not.toBeInTheDocument();
    });

    it("titles the columns", async () => {
        serve();
        renderList();

        const link = await firstCallLink();
        const headers = within(link.closest("table")!)
            .getAllByRole("columnheader")
            .map((h) => h.textContent?.trim());
        expect(headers).toEqual([
            "N",
            "თარიღი",
            "მოსწავლე",
            "ზარის ტიპი",
            "შედეგი",
            "საუბარი",
            "უნდა გადაიხადოს თარიღამდე",
        ]);
    });

    // a long conversation is shortened in the list, the whole text is in the tooltip
    it("shortens a long conversation", async () => {
        const text = `${"word ".repeat(20)}end`;
        serve(() => ({ status: 200, body: { ...rows, rows: [crmCallRow({ callConversation: text })] } }));
        renderList();

        const link = await firstCallLink();
        const cell = within(link.closest("tr")!).getAllByRole("cell")[5];
        expect(cell.textContent).toHaveLength(60);
        expect(cell.textContent?.endsWith("…")).toBe(true);
        expect(within(cell).getByTitle(text)).toBeInTheDocument();
    });

    it("shows empty cells for a call without conversation and date", async () => {
        serve(() => ({
            status: 200,
            body: { ...rows, rows: [crmCallRow({ callConversation: null, mustPayDate: null })] },
        }));
        renderList();

        const link = await firstCallLink();
        const cells = within(link.closest("tr")!).getAllByRole("cell");
        expect(cells.slice(5).map((c) => c.textContent)).toEqual(["", ""]);
        //no conversation, no tooltip
        expect(cells[5].querySelector("span")).toHaveAttribute("title", "");
    });

    it("opens the call from its date and offers a new one", async () => {
        serve();
        renderList();

        expect(await firstCallLink()).toHaveAttribute("href", "/crmCallEdit/5");
        expect(screen.getByRole("link", { name: /ახალი/ })).toHaveAttribute("href", "/crmCallEdit");
    });

    it("keeps the browser from submitting the filter", async () => {
        serve();
        renderList();
        const form = (await screen.findByLabelText("შედეგი")).closest("form")!;

        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    // returning from the call form, or "all calls" of the deposits page: the filter is in the address
    it("takes the filter from the address", async () => {
        const calls = serve();
        renderList("/crmCalls?academicYearId=10&studentContractId=12&answerTypeId=3");

        await firstCallLink();
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "studentContractId", value: "12" },
            { fieldName: "answerTypeId", value: "3" },
        ]);
        expect(screen.getByLabelText("მოსწავლე: სასწავლო წელი")).toHaveValue("10");
        await waitFor(() => expect(studentInput()).toHaveValue("Gamma Gia / 6.001"));
        expect(screen.getByLabelText("შედეგი")).toHaveValue("3");
    });

    it("lists the current year's contracts for the student filter from the CRM endpoint", async () => {
        const calls = serve();
        renderList();

        await firstCallLink();
        expect(screen.getByLabelText("მოსწავლე: სასწავლო წელი")).toHaveValue("11");
        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/crmcalls/studentcontracts")).map((c) => requestedYear(c.url)))
                .toEqual([11])
        );
    });

    it("filters by the chosen student and keeps the year in the address", async () => {
        const calls = serve();
        renderList();
        await firstCallLink();

        fireEvent.focus(studentInput());
        fireEvent.mouseDown(await screen.findByText("Beta Bob / 6.002"));

        await waitFor(() => expect(filterValue(calls, "studentContractId")).toBe("11"));
        expect(location()).toBe("/crmCalls?academicYearId=11&studentContractId=11");
    });

    it("clears the student when the year changes", async () => {
        const calls = serve();
        renderList("/crmCalls?academicYearId=11&studentContractId=10");
        await firstCallLink();

        fireEvent.change(screen.getByLabelText("მოსწავლე: სასწავლო წელი"), { target: { value: "10" } });

        await waitFor(() => expect(filterValue(calls, "studentContractId")).toBeUndefined());
        expect(location()).toBe("/crmCalls?academicYearId=10");
    });

    it("lists the types and the results by name with an empty choice for all", async () => {
        serve();
        renderList();

        const options = async (label: string) =>
            Array.from(((await screen.findByLabelText(label)) as HTMLSelectElement).options).map((o) => [
                o.value,
                o.textContent,
            ]);
        expect(await options("ზარის ტიპი")).toEqual([
            ["", "ყველა"],
            ["2", "Another"],
            ["1", "Reminder"],
        ]);
        expect(await options("შედეგი")).toEqual([
            ["", "ყველა"],
            ["3", "Answered"],
            ["2", "No answer"],
            ["1", "Off"],
        ]);
    });

    it("filters by the type, the result and the dates", async () => {
        const calls = serve();
        renderList();
        await firstCallLink();

        fireEvent.change(screen.getByLabelText("ზარის ტიპი"), { target: { value: "1" } });
        await waitFor(() => expect(filterValue(calls, "callTypeId")).toBe("1"));
        fireEvent.change(screen.getByLabelText("შედეგი"), { target: { value: "2" } });
        await waitFor(() => expect(filterValue(calls, "answerTypeId")).toBe("2"));
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-09-01" } });
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe("2026-09-01"));
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-09-30" } });
        await waitFor(() => expect(filterValue(calls, "dateTo")).toBe("2026-09-30"));
        expect(location()).toBe("/crmCalls?dateFrom=2026-09-01&dateTo=2026-09-30&callTypeId=1&answerTypeId=2");
    });

    // the year of the student list stays
    it("removes the filter", async () => {
        const calls = serve();
        renderList("/crmCalls?academicYearId=10&studentContractId=12&dateFrom=2026-09-01&callTypeId=1&answerTypeId=3");
        await firstCallLink();

        fireEvent.click(screen.getByRole("button", { name: "ფილტრის მოხსნა" }));

        await waitFor(() => expect(lastRowsRequest(calls).filterFields).toEqual([]));
        expect(location()).toBe("/crmCalls?academicYearId=10");
    });

    it("warns about a reversed range and loads nothing for it", async () => {
        const calls = serve();
        renderList("/crmCalls?dateFrom=2026-09-30&dateTo=2026-09-01");

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(0);
    });

    it("hides the shown rows when the range becomes reversed", async () => {
        serve();
        renderList();
        await firstCallLink();

        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-09-01" } });
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-12-31" } });

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "24.09.2026 19:48" })).not.toBeInTheDocument();
    });

    it("sorts by a column on the server and keeps the filter", async () => {
        const calls = serve();
        renderList("/crmCalls?answerTypeId=3");
        await firstCallLink();

        fireEvent.click(screen.getByText("მოსწავლე", { selector: "th *, th" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([{ fieldName: "studentName", ascending: true }])
        );
        expect(filterValue(calls, "answerTypeId")).toBe("3");
    });

    // the memo column is not sortable on the server
    it("does not sort by the conversation", async () => {
        const calls = serve();
        renderList();
        await firstCallLink();

        fireEvent.click(screen.getByText("საუბარი"));
        //a request of the sortable column comes after any request the click above could start
        fireEvent.click(screen.getByText("შედეგი", { selector: "th *, th" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([{ fieldName: "answerTypeName", ascending: true }])
        );
        expect(rowsRequests(calls).flatMap((r) => r.sortByFields.map((s) => s.fieldName))).not.toContain(
            "callConversation"
        );
    });

    it("replaces the history entry when the filter changes", async () => {
        serve();
        renderCrmCallsOnRoute(<CrmCalls />, createCrmCallsStore(), "/crmCalls", "/crmCallEdit", "/crmCalls");
        await firstCallLink();

        fireEvent.change(screen.getByLabelText("შედეგი"), { target: { value: "3" } });
        await waitFor(() => expect(location()).toContain("answerTypeId=3"));
        fireEvent.click(screen.getByRole("button", { name: "test back" }));

        await waitFor(() => expect(location()).toBe("/crmCallEdit"));
    });

    it("loads no contracts when there is no current academic year", async () => {
        const calls = mockFetch((call) => {
            if (call.url.includes("/formlookups"))
                return { status: 200, body: { ...crmCallLookups, currentAcademicYearId: null } };
            if (call.url.includes("/studentcontracts")) return { status: 200, body: [] };
            return { status: 200, body: rows };
        });
        renderList();

        await firstCallLink();
        expect(calls.some((c) => c.url.includes("/studentcontracts"))).toBe(false);
    });

    it("waits while the lookups load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups") ? new Promise<FetchReply>(() => {}) : { status: 200, body: rows }
        );
        renderList();

        expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
    });

    it("tells a role without the right and loads nothing", async () => {
        serve();
        const store = renderList("/crmCalls", "withoutRight");

        expect(await screen.findByText("CRM ზარების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().crmCallsApi.queries).toEqual({});
    });

    it("waits while the menu is loading", () => {
        serve();
        renderList("/crmCalls", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });

    it("tells when the lookups fail to load", async () => {
        mockFetch(() => ({ status: 400, body: { title: "Boom", detail: "server down", status: 400 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getAllByText("server down").length).toBeGreaterThan(0);
    });
});
