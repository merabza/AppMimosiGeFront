//WorkHours.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { decodeFilterSortRequest, type MenuState } from "../testUtils/studentContractsTestStore";
import {
    createWorkHoursStore,
    renderWorkHoursOnRoute,
    workHourData,
    workHourLookups,
    workHourRow,
    workHoursRows,
} from "../testUtils/workHoursTestStore";
import { currentMonthToDate } from "../payments/paymentsListFilter";
import WorkHours from "./WorkHours";

type Reply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

const filterUrl = "/workHours?teacherContractId=1&dateFrom=2026-09-01&dateTo=2026-09-30";

function serve(change: Reply = () => ({ status: 200, body: workHourData() }), rows: Reply = () => ({
    status: 200,
    body: workHoursRows(),
})) {
    return mockFetch((call) => {
        if (call.method !== "GET") return change(call);
        if (call.url.includes("/formlookups")) return { status: 200, body: workHourLookups };
        return rows(call);
    });
}

function renderList(url = "/workHours", menu: MenuState = "withRight") {
    const store = createWorkHoursStore(menu);
    renderWorkHoursOnRoute(<WorkHours />, store, "/workHours", url);
    return store;
}

const rowsRequests = (calls: FetchCall[]) =>
    calls.filter((c) => c.url.includes("/workhours/rowsdata")).map((c) => decodeFilterSortRequest(c.url));

const lastRowsRequest = (calls: FetchCall[]) => rowsRequests(calls)[rowsRequests(calls).length - 1];

const changes = (calls: FetchCall[]) => calls.filter((c) => c.method !== "GET");
const location = () => screen.getByTestId("location").textContent ?? "";
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
const firstRecordLink = () => screen.findByRole("link", { name: "Alpha Ann / T3.01" });
const startButton = () => button("სამუშაოს დაწყება");
const endButton = () => button("სამუშაოს დასრულება");
const generateButton = () => button("მიმდინარე თვის ავტომატური დაგენერირება დღემდე");
//the list's own table (the totals table has headers of the same names)
const gridTable = async () => (await firstRecordLink()).closest("table")!;

describe("WorkHours", () => {
    // Access: from the 1st of the current month until today, every employee
    it("lists the current month until today by default", async () => {
        const calls = serve();
        renderList();

        await firstRecordLink();
        const { dateFrom, dateTo } = currentMonthToDate();
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "dateFrom", value: dateFrom },
            { fieldName: "dateTo", value: dateTo },
        ]);
        expect(lastRowsRequest(calls).sortByFields).toEqual([]);
        expect(screen.getByLabelText("თანამშრომელი")).toHaveValue("");
    });

    it("titles the list and its columns", async () => {
        serve();
        renderList();

        const link = await firstRecordLink();
        expect(screen.getByRole("heading", { name: "სამუშაო საათების შესრულება" })).toBeInTheDocument();
        const headers = within(link.closest("table")!)
            .getAllByRole("columnheader")
            .map((h) => h.textContent?.trim());
        expect(headers).toEqual(["N", "თანამშრომელი", "დაწყება", "დასრულება", "საათები"]);
    });

    it("shows the employee, the start, the end and the hours", async () => {
        serve();
        renderList();

        const link = await firstRecordLink();
        expect(link).toHaveAttribute("href", "/workHourEdit/7");
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(1)).toEqual(["Alpha Ann / T3.01", "15.09.2026 11:55", "15.09.2026 18:05", "6.16"]);
    });

    // a record not ended yet has no end and no duration
    it("shows empty cells for a record not ended yet", async () => {
        serve(undefined, () => ({
            status: 200,
            body: workHoursRows([workHourRow({ whEnd: null, hours: null })]),
        }));
        renderList();

        const link = await firstRecordLink();
        const cells = within(link.closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
        expect(cells.slice(3)).toEqual(["", ""]);
    });

    it("shows the employees' total hours of the filter", async () => {
        serve(undefined, () => ({
            status: 200,
            body: {
                ...workHoursRows(),
                totals: [
                    { teacherContractId: 1, employeeName: "Alpha Ann / T3.01", hours: 14.2, recordsCount: 3 },
                    { teacherContractId: 5, employeeName: "Beta Bob / T3.05", hours: 2.0833, recordsCount: 1 },
                ],
            },
        }));
        renderList();

        await firstRecordLink();
        expect(screen.getByRole("heading", { name: "ჯამური საათები პერიოდში" })).toBeInTheDocument();
        const rows = within(screen.getByTestId("workHoursTotals"))
            .getAllByRole("row")
            .map((r) => within(r).queryAllByRole("cell").map((c) => c.textContent));
        expect(rows.slice(1)).toEqual([
            ["Alpha Ann / T3.01", "14.20", "3"],
            ["Beta Bob / T3.05", "2.08", "1"],
        ]);
    });

    it("hides the totals when nothing is found", async () => {
        serve(undefined, () => ({ status: 200, body: { allRowsCount: 0, offset: 0, rows: [], totals: [] } }));
        renderList();

        await waitFor(() => expect(screen.getByRole("heading", { name: "სამუშაო საათების შესრულება" })).toBeInTheDocument());
        expect(screen.queryByTestId("workHoursTotals")).not.toBeInTheDocument();
    });

    it("lists the employees in the filter", async () => {
        serve();
        renderList();

        await firstRecordLink();
        const options = within(screen.getByLabelText("თანამშრომელი"))
            .getAllByRole("option")
            .map((o) => o.textContent);
        expect(options).toEqual(["ყველა", "Alpha Ann / T3.01", "Alpha Ann / T3.10", "Beta Bob / T3.05"]);
    });

    it("filters by the employee and the dates, kept in the address", async () => {
        const calls = serve();
        renderList();
        await firstRecordLink();

        fireEvent.change(screen.getByLabelText("თანამშრომელი"), { target: { value: "15" } });
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-09-01" } });
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-09-30" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([
                { fieldName: "teacherContractId", value: "15" },
                { fieldName: "dateFrom", value: "2026-09-01" },
                { fieldName: "dateTo", value: "2026-09-30" },
            ])
        );
        expect(location()).toBe("/workHours?teacherContractId=15&dateFrom=2026-09-01&dateTo=2026-09-30");
        expect(lastRowsRequest(calls).offset).toBe(0);
    });

    it("clears the dates and sets the current month again", async () => {
        const calls = serve();
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(button("ყველა თარიღი"));
        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([{ fieldName: "teacherContractId", value: "1" }])
        );

        fireEvent.click(button("ეს თვე"));
        const { dateFrom, dateTo } = currentMonthToDate();
        await waitFor(() =>
            expect(lastRowsRequest(calls).filterFields).toEqual([
                { fieldName: "teacherContractId", value: "1" },
                { fieldName: "dateFrom", value: dateFrom },
                { fieldName: "dateTo", value: dateTo },
            ])
        );
    });

    // the server refuses such a filter, so the list is not requested
    it("warns about a start after the end and loads nothing", async () => {
        const calls = serve();
        renderList("/workHours?dateFrom=2026-09-30&dateTo=2026-09-01");

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        await waitFor(() => expect(calls.some((c) => c.url.includes("/formlookups"))).toBe(true));
        expect(rowsRequests(calls)).toHaveLength(0);
        expect(generateButton()).toBeDisabled();
    });

    // Access: "The employee should be selected"
    it("needs an employee to fix the start or the end", async () => {
        serve();
        renderList();
        await firstRecordLink();

        expect(startButton()).toBeDisabled();
        expect(endButton()).toBeDisabled();
        expect(screen.getByText("სამუშაოს დაწყებისა და დასრულებისთვის აირჩიეთ თანამშრომელი")).toBeInTheDocument();
    });

    // the server fixes its own time; the luft is 5 minutes by default
    it("fixes the start of the chosen employee with the luft and reloads the list", async () => {
        const calls = serve(() => ({ status: 200, body: workHourData({ whStart: "2026-10-02T09:55:12", whEnd: null }) }));
        renderList(filterUrl);
        await firstRecordLink();
        const loads = rowsRequests(calls).length;
        expect(screen.getByLabelText("ლუფტი წუთებში")).toHaveValue(5);

        fireEvent.click(startButton());

        expect(
            await screen.findByText("სამუშაოს დაწყება დაფიქსირდა: Alpha Ann / T3.01, 02.10.2026 09:55")
        ).toBeInTheDocument();
        expect(changes(calls).map((c) => [c.method, c.url.split("/workhours")[1], c.body])).toEqual([
            ["POST", "/start", { teacherContractId: 1, luftMinutes: 5 }],
        ]);
        await waitFor(() => expect(rowsRequests(calls).length).toBe(loads + 1));
    });

    it.each([
        ["10", 10],
        ["", null],
    ])("fixes the end with the luft '%s'", async (luft, luftMinutes) => {
        const calls = serve();
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.change(screen.getByLabelText("ლუფტი წუთებში"), { target: { value: luft } });
        fireEvent.click(endButton());

        expect(
            await screen.findByText("სამუშაოს დასრულება დაფიქსირდა: Alpha Ann / T3.01, 15.09.2026 18:05")
        ).toBeInTheDocument();
        expect(changes(calls).map((c) => [c.url.split("/workhours")[1], c.body])).toEqual([
            ["/end", { teacherContractId: 1, luftMinutes }],
        ]);
    });

    // Access: "Work hours record for today is exists and can not be changed"
    it("shows the server's refusal and clears it on the next action", async () => {
        let reply: FetchReply = {
            status: 409,
            body: { title: "TodayRecordExists", detail: "ამ თანამშრომელს დღევანდელი ჩანაწერი უკვე აქვს", status: 409 },
        };
        serve(() => reply);
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(startButton());
        expect(await screen.findByText("ამ თანამშრომელს დღევანდელი ჩანაწერი უკვე აქვს")).toBeInTheDocument();

        reply = { status: 200, body: workHourData() };
        fireEvent.click(endButton());
        expect(await screen.findByText(/სამუშაოს დასრულება დაფიქსირდა/)).toBeInTheDocument();
        expect(screen.queryByText("ამ თანამშრომელს დღევანდელი ჩანაწერი უკვე აქვს")).not.toBeInTheDocument();
    });

    // a new action takes the old result away while it runs
    it("disables the actions and drops the old result while one runs", async () => {
        let first = true;
        serve(() => {
            if (first) {
                first = false;
                return { status: 200, body: workHourData() };
            }
            return new Promise<FetchReply>(() => undefined);
        });
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(startButton());
        await screen.findByText(/სამუშაოს დაწყება დაფიქსირდა/);
        fireEvent.click(endButton());

        await waitFor(() => expect(startButton()).toBeDisabled());
        expect(endButton()).toBeDisabled();
        expect(generateButton()).toBeDisabled();
        expect(endButton().querySelector(".spinner-border")).not.toBeNull();
        expect(startButton().querySelector(".spinner-border")).toBeNull();
        expect(screen.queryByText(/სამუშაოს დაწყება დაფიქსირდა/)).not.toBeInTheDocument();
    });

    // a start or a generation drops the result of the action before it, too
    it.each([
        ["a start", () => fireEvent.click(startButton())],
        [
            "a generation",
            async () => {
                fireEvent.click(generateButton());
                fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
            },
        ],
    ])("drops the old result when %s begins", async (_name, act) => {
        let first = true;
        serve(() => {
            if (first) {
                first = false;
                return { status: 200, body: workHourData() };
            }
            return new Promise<FetchReply>(() => undefined);
        });
        renderList(filterUrl);
        await firstRecordLink();
        fireEvent.click(endButton());
        await screen.findByText(/სამუშაოს დასრულება დაფიქსირდა/);

        await act();

        await waitFor(() => expect(endButton()).toBeDisabled());
        expect(screen.queryByText(/სამუშაოს დასრულება დაფიქსირდა/)).not.toBeInTheDocument();
    });

    it("shows no result before an action", async () => {
        serve();
        renderList(filterUrl);
        await firstRecordLink();

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("asks before generating, naming the filter's period", async () => {
        const calls = serve();
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(generateButton());

        expect(
            await screen.findByText(
                "დაგენერირდეს სამუშაო დრო ყველა თანამშრომლისთვის 01.09.2026 - 30.09.2026 პერიოდის დღეებზე დღემდე, გაკვეთილების მიხედვით? არსებული ჩანაწერები არ შეიცვლება."
            )
        ).toBeInTheDocument();
        fireEvent.click(button("არა"));
        await waitFor(() =>
            expect(screen.queryByText(/დაგენერირდეს სამუშაო დრო/)).not.toBeInTheDocument()
        );
        expect(changes(calls)).toHaveLength(0);
    });

    // Access: every employee, the filter's dates, only the days before today
    it("generates the filter's period for every employee and tells the count", async () => {
        const calls = serve(() => ({ status: 200, body: { createdCount: 57 } }));
        renderList(filterUrl);
        await firstRecordLink();
        const loads = rowsRequests(calls).length;

        fireEvent.click(generateButton());
        fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("დაგენერირდა 57 ჩანაწერი")).toBeInTheDocument();
        expect(changes(calls).map((c) => [c.url.split("/workhours")[1], c.body])).toEqual([
            ["/autogenerate", { dateFrom: "2026-09-01", dateTo: "2026-09-30" }],
        ]);
        await waitFor(() => expect(rowsRequests(calls).length).toBe(loads + 1));
    });

    it("tells when no new record was generated", async () => {
        serve(() => ({ status: 200, body: { createdCount: 0 } }));
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(generateButton());
        fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("ახალი ჩანაწერი არ დაგენერირდა")).toBeInTheDocument();
    });

    // Access inserted nothing with an empty date
    it.each(["/workHours?dateFrom=&dateTo=2026-09-30", "/workHours?dateFrom=2026-09-01&dateTo="])(
        "needs both dates to generate (%s)",
        async (url) => {
            serve();
            renderList(url);
            await firstRecordLink();

            expect(generateButton()).toBeDisabled();
        }
    );

    it("offers a new record", async () => {
        serve();
        renderList();
        await firstRecordLink();

        fireEvent.click(screen.getByRole("link", { name: /ახალი/ }));

        expect(location()).toBe("/workHourEdit");
    });

    it("tells a user without the menu item that the page is not theirs and loads nothing", async () => {
        const calls = serve();
        const store = renderList("/workHours", "withoutRight");

        expect(await screen.findByText("სამუშაო საათების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().workHoursApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("keeps the browser from submitting the filter", async () => {
        serve();
        renderList();
        const form = (await screen.findByLabelText("ლუფტი წუთებში")).closest("form")!;

        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    it("hides the shown rows and the totals when the range becomes reversed", async () => {
        serve();
        renderList();
        await firstRecordLink();

        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-09-01" } });
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-12-31" } });

        expect(await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Alpha Ann / T3.01" })).not.toBeInTheDocument();
        expect(screen.queryByTestId("workHoursTotals")).not.toBeInTheDocument();
    });

    it("sorts by a column on the server and keeps the filter", async () => {
        const calls = serve();
        renderList(filterUrl);
        const table = await gridTable();

        fireEvent.click(within(table).getByText("დაწყება", { selector: "th *, th" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([{ fieldName: "whStart", ascending: true }])
        );
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "teacherContractId", value: "1" },
            { fieldName: "dateFrom", value: "2026-09-01" },
            { fieldName: "dateTo", value: "2026-09-30" },
        ]);
    });

    // the duration is computed after loading, so the server does not sort by it
    it("does not sort by the hours", async () => {
        const calls = serve();
        renderList();
        const table = await gridTable();

        fireEvent.click(within(table).getByText("საათები"));
        //a request of the sortable column comes after any request the click above could start
        fireEvent.click(within(table).getByText("დასრულება", { selector: "th *, th" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([{ fieldName: "whEnd", ascending: true }])
        );
        expect(rowsRequests(calls).flatMap((r) => r.sortByFields.map((f) => f.fieldName))).not.toContain("hours");
    });

    it("replaces the history entry when the filter changes", async () => {
        serve();
        renderWorkHoursOnRoute(<WorkHours />, createWorkHoursStore(), "/workHours", "/workHourEdit", "/workHours");
        await firstRecordLink();

        fireEvent.change(screen.getByLabelText("თანამშრომელი"), { target: { value: "15" } });
        await waitFor(() => expect(location()).toContain("teacherContractId=15"));
        fireEvent.click(button("test back"));

        await waitFor(() => expect(location()).toBe("/workHourEdit"));
    });

    // an error left by another page is not shown here
    it("clears the change errors left from before", async () => {
        serve();
        const store = createWorkHoursStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderWorkHoursOnRoute(<WorkHours />, store, "/workHours", "/workHours");

        await firstRecordLink();
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
    });

    it("starts without the generation question", async () => {
        serve();
        renderList(filterUrl);
        await firstRecordLink();

        expect(screen.queryByRole("button", { name: "დიახ" })).not.toBeInTheDocument();
    });

    it("titles the generation question", async () => {
        serve();
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(generateButton());

        expect(await screen.findByText("სამუშაო დროის ავტომატური დაგენერირება")).toBeInTheDocument();
    });

    it("asks again after the generation was declined", async () => {
        serve();
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(generateButton());
        fireEvent.click(await screen.findByRole("button", { name: "არა" }));
        await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());
        fireEvent.click(generateButton());

        expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
    });

    it("asks again after a generation", async () => {
        serve(() => ({ status: 200, body: { createdCount: 0 } }));
        renderList(filterUrl);
        await firstRecordLink();

        fireEvent.click(generateButton());
        fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
        await screen.findByText("ახალი ჩანაწერი არ დაგენერირდა");
        fireEvent.click(generateButton());

        expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
    });

    it("shows the spinner only on the start button while starting", async () => {
        serve(() => new Promise<FetchReply>(() => undefined));
        renderList(filterUrl);
        await firstRecordLink();
        expect(startButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.click(startButton());

        await waitFor(() => expect(startButton()).toBeDisabled());
        expect(startButton().querySelector(".spinner-border")).not.toBeNull();
        expect(endButton().querySelector(".spinner-border")).toBeNull();
        expect(generateButton().querySelector(".spinner-border")).toBeNull();
    });

    it("shows the spinner only on the generation button while generating", async () => {
        serve(() => new Promise<FetchReply>(() => undefined));
        renderList(filterUrl);
        await firstRecordLink();
        expect(generateButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.click(generateButton());
        fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

        await waitFor(() => expect(generateButton()).toBeDisabled());
        expect(generateButton().querySelector(".spinner-border")).not.toBeNull();
        expect(startButton().querySelector(".spinner-border")).toBeNull();
        expect(startButton()).toBeDisabled();
    });

    it("waits while the lookups load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? new Promise<FetchReply>(() => undefined)
                : { status: 200, body: workHoursRows() }
        );
        renderList();

        expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
    });

    it("waits while the menu is loading", () => {
        serve();
        renderList("/workHours", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });

    it("tells when the lookups fail to load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? { status: 400, body: { title: "Error", detail: "server down", status: 400 } }
                : { status: 200, body: workHoursRows() }
        );
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getByText("server down")).toBeInTheDocument();
    });
});
