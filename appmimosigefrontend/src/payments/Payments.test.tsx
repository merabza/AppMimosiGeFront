//Payments.test.tsx

import { act, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setUser } from "../appcarcass/redux/slices/userSlice";
import type { IAppUser } from "../appcarcass/redux/types/authenticationTypes";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { decodeFilterSortRequest, type MenuState } from "../testUtils/studentContractsTestStore";
import {
    createPaymentsStore,
    paymentLookups,
    paymentRow,
    renderPaymentsOnRoute,
    requestedYear,
    yearContracts,
} from "../testUtils/paymentsTestStore";
import { currentMonthToDate } from "./paymentsListFilter";
import Payments from "./Payments";

const rows = { allRowsCount: 1, offset: 0, totalAmount: 10728.75, rows: [paymentRow] };

function serve(rowsReply: () => FetchReply | Promise<FetchReply> = () => ({ status: 200, body: rows })): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: paymentLookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: yearContracts[requestedYear(call.url)] ?? [] };
        return rowsReply();
    });
}

function renderList(url = "/payments", menu: MenuState = "withRight", appClaims?: string[]) {
    const store = createPaymentsStore(menu, appClaims);
    renderPaymentsOnRoute(<Payments />, store, "/payments", url);
    return store;
}

function rowsRequests(calls: FetchCall[]) {
    return calls.filter((c) => c.url.includes("/payments/rowsdata")).map((c) => decodeFilterSortRequest(c.url));
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

describe("Payments", () => {
    // Access: from the first day of the month until today
    it("lists this month's payments until today by default", async () => {
        const calls = serve();
        renderList();

        expect(await screen.findByText("15.09.2026")).toBeInTheDocument();
        const month = currentMonthToDate();
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "dateFrom", value: month.dateFrom },
            { fieldName: "dateTo", value: month.dateTo },
        ]);
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue(month.dateFrom);
        expect(screen.getByLabelText("თარიღამდე")).toHaveValue(month.dateTo);
    });

    it("shows the student, the date, the amount, the document and the bank in order", async () => {
        serve();
        renderList();

        const link = await screen.findByRole("link", { name: "Alpha Ann 6.001" });
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(1)).toEqual(["Alpha Ann 6.001", "15.09.2026", "300.00", "N 15", "Zeta Bank"]);
    });

    it("opens the payment from the student's name", async () => {
        serve();
        renderList();

        expect(await screen.findByRole("link", { name: "Alpha Ann 6.001" })).toHaveAttribute(
            "href",
            "/paymentEdit/5"
        );
    });

    it("offers a new payment", async () => {
        serve();
        renderList();

        expect(await screen.findByRole("link", { name: /ახალი/ })).toHaveAttribute("href", "/paymentEdit");
    });

    // Access footer =Sum([Amount]): the sum of the whole filter, from the server
    it("shows the sum of the filtered payments", async () => {
        serve();
        renderList();

        expect(await screen.findByTestId("paymentsTotal")).toHaveTextContent("ჯამი: 10728.75");
    });

    it("shows no sum before the rows arrive", async () => {
        serve(() => new Promise<FetchReply>(() => {}));
        renderList();

        await screen.findByLabelText("ბანკი");
        expect(screen.queryByTestId("paymentsTotal")).not.toBeInTheDocument();
    });

    // the checked flag is the special right's: other roles do not see it (D77)
    it("hides the checked column without the special right", async () => {
        serve();
        renderList();

        await screen.findByText("15.09.2026");
        expect(screen.queryByText("შემოწმებულია")).not.toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
    });

    it("shows the checked column with the special right", async () => {
        serve();
        renderList("/payments", "withRight", ["CheckPayments"]);

        const link = await screen.findByRole("link", { name: "Alpha Ann 6.001" });
        expect(screen.getByText("შემოწმებულია")).toBeInTheDocument();
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(1)).toEqual(["Alpha Ann 6.001", "15.09.2026", "300.00", "N 15", "Zeta Bank", "✓"]);
    });

    it("shows an unchecked payment without a mark", async () => {
        serve(() => ({ status: 200, body: { ...rows, rows: [{ ...paymentRow, checked: false }] } }));
        renderList("/payments", "withRight", ["CheckPayments"]);

        const link = await screen.findByRole("link", { name: "Alpha Ann 6.001" });
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(1)).toEqual(["Alpha Ann 6.001", "15.09.2026", "300.00", "N 15", "Zeta Bank", ""]);
    });

    it("titles the columns as the Access form does", async () => {
        serve();
        renderList("/payments", "withRight", ["CheckPayments"]);

        const link = await screen.findByRole("link", { name: "Alpha Ann 6.001" });
        const headers = within(link.closest("table")!)
            .getAllByRole("columnheader")
            .map((h) => h.textContent?.trim());
        expect(headers).toEqual(["N", "მოსწავლე", "გადახდის თარიღი", "თანხა", "დოკუმენტი", "ბანკი", "შემოწმებულია"]);
    });

    // a new sign-in with the special right shows the column without leaving the page
    it("shows the checked column once the special right arrives", async () => {
        serve();
        const store = renderList();
        await screen.findByText("15.09.2026");
        expect(screen.queryByText("შემოწმებულია")).not.toBeInTheDocument();

        act(() => {
            store.dispatch(setUser({ token: "token", appClaims: ["CheckPayments"] } as unknown as IAppUser));
        });

        expect(await screen.findByText("შემოწმებულია")).toBeInTheDocument();
    });

    // the list follows the filter at once; the browser must not submit the filter form
    it("keeps the browser from submitting the filter", async () => {
        serve();
        renderList();
        const form = (await screen.findByLabelText("ბანკი")).closest("form")!;

        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    // returning from the payment form: the filter is in the address
    it("takes the filter from the address", async () => {
        const calls = serve();
        renderList("/payments?academicYearId=10&studentContractId=12&bankAccountId=&dateFrom=&dateTo=");

        await screen.findByText("15.09.2026");
        expect(lastRowsRequest(calls).filterFields).toEqual([{ fieldName: "studentContractId", value: "12" }]);
        expect(screen.getByLabelText("მოსწავლე: სასწავლო წელი")).toHaveValue("10");
        await waitFor(() => expect(studentInput()).toHaveValue("Gamma Gia 6.001"));
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue("");
    });

    // without a year in the address the student list is the current year's
    it("lists the current year's contracts for the student filter", async () => {
        const calls = serve();
        renderList();

        await screen.findByText("15.09.2026");
        expect(screen.getByLabelText("მოსწავლე: სასწავლო წელი")).toHaveValue("11");
        await waitFor(() =>
            expect(calls.filter((c) => c.url.includes("/studentcontracts")).map((c) => requestedYear(c.url))).toEqual([11])
        );
    });

    it("filters by the bank and keeps it in the address", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("15.09.2026");

        fireEvent.change(screen.getByLabelText("ბანკი"), { target: { value: "4" } });

        await waitFor(() => expect(filterValue(calls, "bankAccountId")).toBe("4"));
        expect(location()).toContain("bankAccountId=4");
        //the dates stay
        expect(filterValue(calls, "dateFrom")).toBe(currentMonthToDate().dateFrom);
    });

    it("lists the banks by name with an empty choice for all", async () => {
        serve();
        renderList();

        const select = (await screen.findByLabelText("ბანკი")) as HTMLSelectElement;
        expect(Array.from(select.options).map((o) => [o.value, o.textContent])).toEqual([
            ["", "ყველა"],
            ["4", "Alpha Bank"],
            ["9", "Transfer"],
            ["1", "Zeta Bank"],
        ]);
    });

    it("filters by the chosen student and keeps the year in the address", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("15.09.2026");

        fireEvent.focus(studentInput());
        fireEvent.mouseDown(await screen.findByText("Beta Bob 6.002"));

        await waitFor(() => expect(filterValue(calls, "studentContractId")).toBe("11"));
        expect(location()).toContain("academicYearId=11");
        expect(location()).toContain("studentContractId=11");
    });

    it("clears the student when the year changes", async () => {
        const calls = serve();
        renderList("/payments?academicYearId=11&studentContractId=10&bankAccountId=&dateFrom=&dateTo=");
        await screen.findByText("15.09.2026");

        fireEvent.change(screen.getByLabelText("მოსწავლე: სასწავლო წელი"), { target: { value: "10" } });

        await waitFor(() => expect(filterValue(calls, "studentContractId")).toBeUndefined());
        expect(location()).toContain("academicYearId=10");
        expect(location()).toContain("studentContractId=&");
    });

    it("removes the student filter", async () => {
        const calls = serve();
        renderList("/payments?academicYearId=11&studentContractId=10&bankAccountId=&dateFrom=&dateTo=");
        await screen.findByText("15.09.2026");

        fireEvent.click(await screen.findByTitle("მოსწავლის ფილტრის მოხსნა"));

        await waitFor(() => expect(filterValue(calls, "studentContractId")).toBeUndefined());
        expect(rowsRequests(calls).length).toBeGreaterThan(1);
    });

    it("filters by the typed dates", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("15.09.2026");

        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-09-01" } });
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe("2026-09-01"));
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-09-30" } });
        await waitFor(() => expect(filterValue(calls, "dateTo")).toBe("2026-09-30"));
    });

    it("sets the range to all dates and back to this month", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("15.09.2026");

        fireEvent.click(screen.getByRole("button", { name: "ყველა თარიღი" }));
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBeUndefined());
        expect(filterValue(calls, "dateTo")).toBeUndefined();

        fireEvent.click(screen.getByRole("button", { name: "ეს თვე" }));
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe(currentMonthToDate().dateFrom));
        expect(filterValue(calls, "dateTo")).toBe(currentMonthToDate().dateTo);
    });

    it("warns about a reversed range and loads nothing for it", async () => {
        const calls = serve();
        renderList("/payments?academicYearId=&studentContractId=&bankAccountId=&dateFrom=2026-09-30&dateTo=2026-09-01");

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(0);
        expect(screen.queryByTestId("paymentsTotal")).not.toBeInTheDocument();
    });

    it("sorts by a column on the server", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("15.09.2026");

        fireEvent.click(screen.getByText("თანხა"));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([{ fieldName: "amount", ascending: true }])
        );
        //the filter stays
        expect(filterValue(calls, "dateFrom")).toBe(currentMonthToDate().dateFrom);
    });

    // a range turned around after the rows were shown: the old rows and their sum must not stay
    it("hides the shown rows and the sum when the range becomes reversed", async () => {
        serve();
        renderList();
        await screen.findByText("15.09.2026");
        expect(screen.getByTestId("paymentsTotal")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-12-31" } });

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(screen.queryByText("15.09.2026")).not.toBeInTheDocument();
        expect(screen.queryByTestId("paymentsTotal")).not.toBeInTheDocument();
    });

    // the filter replaces the address, so "back" leaves the list instead of stepping through the filters
    it("replaces the history entry when the filter changes", async () => {
        serve();
        renderPaymentsOnRoute(<Payments />, createPaymentsStore(), "/payments", "/paymentEdit", "/payments");
        await screen.findByText("15.09.2026");

        fireEvent.change(screen.getByLabelText("ბანკი"), { target: { value: "4" } });
        await waitFor(() => expect(location()).toContain("bankAccountId=4"));
        fireEvent.click(screen.getByRole("button", { name: "test back" }));

        await waitFor(() => expect(location()).toBe("/paymentEdit"));
    });

    it("loads no contracts when there is no current academic year", async () => {
        const calls = mockFetch((call) => {
            if (call.url.includes("/formlookups"))
                return { status: 200, body: { ...paymentLookups, currentAcademicYearId: null } };
            if (call.url.includes("/studentcontracts")) return { status: 200, body: [] };
            return { status: 200, body: rows };
        });
        renderList();

        await screen.findByText("15.09.2026");
        expect(calls.some((c) => c.url.includes("/studentcontracts"))).toBe(false);
    });

    it("waits while the lookups load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? new Promise<FetchReply>(() => {})
                : { status: 200, body: rows }
        );
        renderList();

        expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
    });

    it("tells a role without the right and loads nothing", async () => {
        serve();
        const store = renderList("/payments", "withoutRight");

        expect(await screen.findByText("გადახდების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().paymentsApi.queries).toEqual({});
    });

    it("waits while the menu is loading", () => {
        serve();
        renderList("/payments", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });

    it("tells when the lookups fail to load", async () => {
        mockFetch(() => ({ status: 400, body: { title: "Boom", detail: "server down", status: 400 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        //the lookups and the rows fail alike
        expect(screen.getAllByText("server down").length).toBeGreaterThan(0);
    });
});
