//ChargesAndPayments.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { decodeFilterSortRequest, type MenuState } from "../testUtils/studentContractsTestStore";
import {
    balancesLookups,
    createBalancesStore,
    renderBalancesOnRoute,
    statementRow,
} from "../testUtils/balancesTestStore";
import { requestedYear, yearContracts } from "../testUtils/paymentsTestStore";
import { previousMonthToDate } from "./statementFilter";
import ChargesAndPayments from "./ChargesAndPayments";

const rows = {
    allRowsCount: 2,
    offset: 0,
    startBalance: 100,
    endBalance: 116.6667,
    rows: [
        statementRow(),
        statementRow({
            isPayment: true,
            id: 31,
            operationDate: "2026-09-16T00:00:00",
            document: "bank 7",
            amount: 25,
            runningTotal: 116.6667,
        }),
    ],
};

function serve(rowsReply: () => FetchReply | Promise<FetchReply> = () => ({ status: 200, body: rows })): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: balancesLookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: yearContracts[requestedYear(call.url)] ?? [] };
        return rowsReply();
    });
}

function renderPage(url = "/chargesAndPayments", menu: MenuState = "withRight") {
    const store = createBalancesStore(menu);
    renderBalancesOnRoute(<ChargesAndPayments />, store, "/chargesAndPayments", url);
    return store;
}

const yearSelect = () => screen.getByLabelText("მოსწავლე: სასწავლო წელი");

function contractsRequests(calls: FetchCall[]) {
    return calls.filter((c) => c.url.includes("/studentcontracts")).map((c) => requestedYear(c.url));
}

function rowsRequests(calls: FetchCall[]) {
    return calls.filter((c) => c.url.includes("/chargesandpayments/rowsdata")).map((c) => decodeFilterSortRequest(c.url));
}

function lastRowsRequest(calls: FetchCall[]) {
    const requests = rowsRequests(calls);
    return requests[requests.length - 1];
}

const location = () => screen.getByTestId("location").textContent ?? "";

describe("ChargesAndPayments", () => {
    // Access: every student, from the first day of the previous month until today
    it("loads the statement from the previous month until today by default", async () => {
        const calls = serve();
        renderPage();

        expect(await screen.findByText("15.09.2026 15:00")).toBeInTheDocument();
        const range = previousMonthToDate();
        expect(lastRowsRequest(calls)).toEqual({
            offset: 0,
            rowsCount: 10,
            filterFields: [
                { fieldName: "dateFrom", value: range.dateFrom },
                { fieldName: "dateTo", value: range.dateTo },
            ],
            sortByFields: [],
        });
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue(range.dateFrom);
        expect(screen.getByLabelText("თარიღამდე")).toHaveValue(range.dateTo);
    });

    it("shows the id, the kind, the date, the student, the document, the amount and the balance in order", async () => {
        serve();
        renderPage();

        const charge = (await screen.findByText("15.09.2026 15:00")).closest("tr")!;
        expect(within(charge).getAllByRole("cell").map((c) => c.textContent).slice(1)).toEqual([
            "31",
            "დარიცხვა",
            "15.09.2026 15:00",
            "Alpha Ann / 6.001",
            "English",
            "-8.33",
            "91.67",
        ]);
        //a payment shows its day without a time
        const payment = screen.getByText("16.09.2026").closest("tr")!;
        expect(within(payment).getAllByRole("cell").map((c) => c.textContent).slice(1)).toEqual([
            "31",
            "გადახდა",
            "16.09.2026",
            "Alpha Ann / 6.001",
            "bank 7",
            "25.00",
            "116.67",
        ]);
    });

    it("shows the column captions", async () => {
        serve();
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        expect(within(screen.getAllByRole("row")[0]).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
            "N",
            "ID",
            "სახე",
            "თარიღი",
            "მოსწავლე",
            "დოკუმენტი",
            "თანხა",
            "ნაშთი",
        ]);
    });

    // a charge and a payment may have the same id: every row still needs its own key
    it("keys the rows by kind and id", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            serve();
            renderPage();

            expect(await screen.findByText("16.09.2026")).toBeInTheDocument();
            expect(consoleError.mock.calls.some((args) => args.some((arg) => String(arg).includes("key")))).toBe(
                false
            );
        } finally {
            consoleError.mockRestore();
        }
    });

    it("shows the start balance above and the end balance below", async () => {
        serve();
        renderPage();

        expect(await screen.findByTestId("startBalance")).toHaveTextContent("საწყისი ნაშთი: 100.00");
        expect(screen.getByTestId("endBalance")).toHaveTextContent("საბოლოო ნაშთი: 116.67");
    });

    it("shows no balances before the rows arrive", async () => {
        serve(() => new Promise<FetchReply>(() => {}));
        renderPage();

        await screen.findByLabelText("თარიღიდან");
        expect(screen.queryByTestId("startBalance")).not.toBeInTheDocument();
        expect(screen.queryByTestId("endBalance")).not.toBeInTheDocument();
    });

    // the running total depends on the statement order, so the columns cannot be sorted
    it("offers no sorting", async () => {
        serve();
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        //a sortable GridView column has a link in its header
        expect(within(screen.getAllByRole("row")[0]).queryAllByRole("link")).toHaveLength(0);
    });

    // from the deposits: the contract (of its year) and the dates are in the address
    it("filters by the contract and the dates of the address", async () => {
        const calls = serve();
        renderPage(
            "/chargesAndPayments?academicYearId=11&studentContractId=11&dateFrom=2026-09-10&dateTo=2026-10-31"
        );

        await screen.findByText("15.09.2026 15:00");
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "studentContractId", value: "11" },
            { fieldName: "dateFrom", value: "2026-09-10" },
            { fieldName: "dateTo", value: "2026-10-31" },
        ]);
        await waitFor(() => expect(screen.getByLabelText("მოსწავლე")).toHaveValue("Beta Bob 6.002"));
    });

    // the student list comes from the statement's own endpoint (its own menu right)
    it("loads the students of the current year from the statement endpoint", async () => {
        const calls = serve();
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        await waitFor(() =>
            expect(calls.map((c) => c.url)).toContain(
                "http://localhost:5070/api/v1/chargesandpayments/studentcontracts?academicYearId=11"
            )
        );
        expect(calls.some((c) => c.url.includes("/payments/"))).toBe(false);
    });

    it("chooses a student and loads the statement of the contract", async () => {
        const calls = serve();
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        fireEvent.focus(screen.getByLabelText("მოსწავლე"));
        fireEvent.change(screen.getByLabelText("მოსწავლე"), { target: { value: "beta" } });
        fireEvent.mouseDown(await screen.findByText("Beta Bob 6.002"));

        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toContainEqual({ fieldName: "studentContractId", value: "11" })
        );
        expect(location()).toContain("studentContractId=11");
        expect(lastRowsRequest(calls).offset).toBe(0);
    });

    it("opens the student list of the year in the address", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?academicYearId=10&studentContractId=12&dateFrom=&dateTo=");

        await waitFor(() => expect(screen.getByLabelText("მოსწავლე")).toHaveValue("Gamma Gia 6.001"));
        expect(yearSelect()).toHaveValue("10");
        expect(contractsRequests(calls)).toEqual([10]);
    });

    // without a current year there is no list to choose a student from
    it("loads no student list without a current year", async () => {
        const calls = mockFetch((call) => {
            if (call.url.includes("/formlookups"))
                return { status: 200, body: { ...balancesLookups, currentAcademicYearId: null } };
            if (call.url.includes("/studentcontracts")) return { status: 200, body: [] };
            return { status: 200, body: rows };
        });
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        expect(contractsRequests(calls)).toEqual([]);
    });

    it("changes the year of the student list and drops the chosen student", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?academicYearId=11&studentContractId=10&dateFrom=&dateTo=");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.change(yearSelect(), { target: { value: "10" } });

        await waitFor(() => expect(contractsRequests(calls)).toContain(10));
        expect(location()).toBe("/chargesAndPayments?academicYearId=10&studentContractId=&dateFrom=&dateTo=");
        await waitFor(() => expect(lastRowsRequest(calls).filterFields).toEqual([]));
    });

    it("changes the start date", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?dateFrom=2026-09-01&dateTo=2026-09-30");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-09-10" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([
                { fieldName: "dateFrom", value: "2026-09-10" },
                { fieldName: "dateTo", value: "2026-09-30" },
            ])
        );
    });

    // the filter replaces the address: going back leaves the statement instead of stepping through the filters
    it("keeps no history of the filter changes", async () => {
        serve();
        const store = createBalancesStore();
        renderBalancesOnRoute(<ChargesAndPayments />, store, "/chargesAndPayments", "/payments",
            "/chargesAndPayments?dateFrom=2026-09-01&dateTo=2026-09-30");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-10-31" } });
        await waitFor(() => expect(location()).toContain("dateTo=2026-10-31"));
        fireEvent.click(screen.getByRole("button", { name: "test back" }));

        expect(location()).toBe("/payments");
    });

    // the form only holds the filter: submitting it must not reload the page
    it("does not submit the filter form", async () => {
        serve();
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        const form = screen.getByLabelText("თარიღიდან").closest("form")!;
        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    it("changes the dates", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?dateFrom=2026-09-01&dateTo=2026-09-30");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-10-31" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([
                { fieldName: "dateFrom", value: "2026-09-01" },
                { fieldName: "dateTo", value: "2026-10-31" },
            ])
        );
    });

    it("shows every date with the button", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?studentContractId=10&dateFrom=2026-09-01&dateTo=2026-09-30");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.click(screen.getByRole("button", { name: "ყველა თარიღი" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([{ fieldName: "studentContractId", value: "10" }])
        );
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue("");
    });

    it("goes back to the default range with the button", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?dateFrom=&dateTo=");

        await screen.findByText("15.09.2026 15:00");
        fireEvent.click(screen.getByRole("button", { name: "წინა თვიდან დღემდე" }));

        const range = previousMonthToDate();
        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([
                { fieldName: "dateFrom", value: range.dateFrom },
                { fieldName: "dateTo", value: range.dateTo },
            ])
        );
    });

    // the server does not take such a range: it is not sent
    it("warns about a start after the end and loads nothing", async () => {
        const calls = serve();
        renderPage("/chargesAndPayments?dateFrom=2026-10-02&dateTo=2026-10-01");

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(0);
        expect(screen.queryByTestId("startBalance")).not.toBeInTheDocument();
    });

    it("loads the next page", async () => {
        const calls = serve(() => ({ status: 200, body: { ...rows, allRowsCount: 25 } }));
        renderPage();

        await screen.findByText("15.09.2026 15:00");
        //GridView-ის გვერდების ღილაკები: პირველი, წინა, შემდეგი, ბოლო
        fireEvent.click(document.querySelectorAll("button.btn-space")[2]);

        await waitFor(() => expect(lastRowsRequest(calls).offset).toBe(10));
    });

    it("says so without the menu right and loads nothing", async () => {
        const calls = serve();
        const store = renderPage("/chargesAndPayments", "withoutRight");

        expect(await screen.findByText("დარიცხვებისა და გადახდების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
        expect(Object.keys(store.getState().chargesAndPaymentsApi.queries)).toHaveLength(0);
    });

    it("waits while the menu is loading", () => {
        serve();
        renderPage("/chargesAndPayments", "loading");

        expect(screen.queryByLabelText("თარიღიდან")).not.toBeInTheDocument();
        expect(screen.queryByText("დარიცხვებისა და გადახდების ნახვის უფლება არ გაქვთ")).not.toBeInTheDocument();
    });

    it("shows the load problem", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? { status: 500, body: { title: "Boom", detail: "boom", status: 500 } }
                : { status: 200, body: rows }
        );
        renderPage();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
