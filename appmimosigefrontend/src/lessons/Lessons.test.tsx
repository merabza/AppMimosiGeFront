//Lessons.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall } from "../testUtils/testStore";
import { decodeFilterSortRequest, type MenuState } from "../testUtils/studentContractsTestStore";
import {
    createLessonsStore,
    lessonLookups,
    renderLessonsOnRoute,
    type LessonsStore,
} from "../testUtils/lessonsTestStore";
import type { ILessonRow } from "../redux/types/lessonsTypes";
import { currentMonth, currentWeek } from "./lessonsListFilter";
import Lessons from "./Lessons";

const lessonRow: ILessonRow = {
    lessonId: 9,
    lessonDt: "2026-09-30T15:00:00",
    grpId: 7,
    groupCode: "1001",
    courseName: "Math",
    teacherName: "Alpha Ann",
    substituteTeacherName: "Beta Bob",
    lessonStatusId: 1,
    lessonStatusName: "არ გაუქმებულა",
    studentsCount: 3,
    presentCount: 2,
};

function serve(): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lessonLookups };
        return { status: 200, body: { allRowsCount: 1, offset: 0, rows: [lessonRow] } };
    });
}

function renderList(url = "/lessons", menu: MenuState = "withRight") {
    return renderLessonsOnRoute(<Lessons />, createLessonsStore(menu), "/lessons", url);
}

// the queries the page started in the store: a started query is there at once, before any fetch
function startedQueries(store: LessonsStore) {
    return Object.keys(store.getState().lessonsApi.queries);
}

function lastRowsRequest(calls: FetchCall[]) {
    const requests = calls
        .filter((c) => c.url.includes("/lessons/rowsdata"))
        .map((c) => decodeFilterSortRequest(c.url));
    return requests[requests.length - 1];
}

function filterValue(calls: FetchCall[], fieldName: string) {
    return lastRowsRequest(calls).filterFields.find((f) => f.fieldName === fieldName)?.value;
}

describe("Lessons", () => {
    it("lists the lessons of the current week by default", async () => {
        const calls = serve();
        renderList();

        expect(await screen.findByText("30.09.2026 15:00")).toBeInTheDocument();
        const week = currentWeek();
        expect(lastRowsRequest(calls).filterFields).toEqual([
            { fieldName: "dateFrom", value: week.dateFrom },
            { fieldName: "dateTo", value: week.dateTo },
        ]);
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue(week.dateFrom);
    });

    it("shows group, course, teacher, substitute, status and the counts", async () => {
        serve();
        renderList();

        await screen.findByText("30.09.2026 15:00");
        //the cells of the row in column order (the filter selects hold some of these texts too)
        expect(
            within(screen.getAllByRole("row")[1])
                .getAllByRole("cell")
                .map((c) => c.textContent)
        ).toEqual([
            "1",
            "30.09.2026 15:00",
            "1001",
            "Math",
            "Alpha Ann",
            "Beta Bob",
            "არ გაუქმებულა",
            "3",
            "2",
            "9",
        ]);
    });

    it("opens the lesson from its time", async () => {
        serve();
        renderList();

        expect(await screen.findByRole("link", { name: "30.09.2026 15:00" })).toHaveAttribute(
            "href",
            "/lessonEdit/9"
        );
    });

    // the group page link: all lessons of the group
    it("takes the filter from the address", async () => {
        const calls = serve();
        renderList("/lessons?grpId=7&dateFrom=&dateTo=");

        await screen.findByText("30.09.2026 15:00");
        expect(lastRowsRequest(calls).filterFields).toEqual([{ fieldName: "grpId", value: "7" }]);
        expect(screen.getByLabelText("ჯგუფი")).toHaveValue("7");
        expect(screen.getByLabelText("თარიღიდან")).toHaveValue("");
    });

    it.each([
        ["ჯგუფი", "grpId", "8"],
        ["მასწავლებელი ან შემცვლელი", "teacherContractId", "5"],
        ["სტატუსი", "lessonStatusId", "2"],
    ])("filters by %s and keeps it in the address", async (label, fieldName, value) => {
        const calls = serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        fireEvent.change(screen.getByLabelText(label), { target: { value } });

        await waitFor(() => expect(filterValue(calls, fieldName)).toBe(value));
        expect(screen.getByTestId("location").textContent).toContain(`${fieldName}=${value}`);
        //the dates stay
        expect(filterValue(calls, "dateFrom")).toBe(currentWeek().dateFrom);
    });

    it("filters the unfilled lessons", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        fireEvent.click(screen.getByLabelText(/შეუვსებელი/));

        await waitFor(() => expect(filterValue(calls, "unfilled")).toBe("true"));
        fireEvent.click(screen.getByLabelText(/შეუვსებელი/));
        await waitFor(() => expect(filterValue(calls, "unfilled")).toBeUndefined());
    });

    it("sets the range to this month, this week and to all dates", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        fireEvent.click(screen.getByRole("button", { name: "ეს თვე" }));
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe(currentMonth().dateFrom));
        expect(filterValue(calls, "dateTo")).toBe(currentMonth().dateTo);

        fireEvent.click(screen.getByRole("button", { name: "ყველა თარიღი" }));
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBeUndefined());
        expect(filterValue(calls, "dateTo")).toBeUndefined();

        fireEvent.click(screen.getByRole("button", { name: "ეს კვირა" }));
        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe(currentWeek().dateFrom));
    });

    it("changes both dates by hand", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2026-12-31" } });
        await waitFor(() => expect(filterValue(calls, "dateTo")).toBe("2026-12-31"));
        fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-09-01" } });

        await waitFor(() => expect(filterValue(calls, "dateFrom")).toBe("2026-09-01"));
        expect(filterValue(calls, "dateTo")).toBe("2026-12-31");
    });

    it("shows the column captions and the lesson id in a column that does not sort", async () => {
        serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toEqual([
            "N",
            "თარიღი და დრო",
            "ჯგუფი",
            "საგანი",
            "მასწავლებელი",
            "შემცვლელი",
            "სტატუსი",
            "მოსწავლეები",
            "დამსწრეები",
            "ID",
        ]);
        //the server sorts by the listed fields only: the id column has no sort link
        expect(
            within(screen.getByRole("columnheader", { name: "ID" })).queryByRole("link")
        ).not.toBeInTheDocument();
        const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
        expect(cells[cells.length - 1].textContent).toBe("9");
    });

    it("sorts by a clicked column and keeps the filter", async () => {
        const calls = serve();
        renderList();
        await screen.findByText("30.09.2026 15:00");

        fireEvent.click(screen.getByRole("link", { name: "ჯგუფი" }));

        await waitFor(() =>
            expect(lastRowsRequest(calls).sortByFields).toEqual([
                { fieldName: "groupCode", ascending: true },
            ])
        );
        expect(filterValue(calls, "dateFrom")).toBe(currentWeek().dateFrom);
    });

    // a filter change replaces the address: the browser's back button leaves the list
    it("does not add a history entry for a filter change", async () => {
        serve();
        renderLessonsOnRoute(<Lessons />, createLessonsStore(), "/lessons", "/start", "/lessons");
        await screen.findByText("30.09.2026 15:00");

        fireEvent.change(screen.getByLabelText("ჯგუფი"), { target: { value: "8" } });
        await waitFor(() =>
            expect(screen.getByTestId("location").textContent).toContain("grpId=8")
        );
        fireEvent.click(screen.getByRole("button", { name: "test back" }));

        expect(screen.getByTestId("location").textContent).toBe("/start");
    });

    it("keeps the browser on the page when the filter form is submitted", async () => {
        serve();
        const { container } = renderList();
        await screen.findByText("30.09.2026 15:00");
        const form = container.querySelector("form")!;
        const submit = createEvent.submit(form);

        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    it("warns about a reversed range and does not ask the server", async () => {
        const calls = serve();
        renderList("/lessons?dateFrom=2026-10-02&dateTo=2026-10-01");

        expect(
            await screen.findByText("დაწყების თარიღი დასრულების თარიღზე გვიან არის")
        ).toBeInTheDocument();
        expect(calls.filter((c) => c.url.includes("/rowsdata"))).toHaveLength(0);
    });

    it("says so without the lessons right and loads nothing", () => {
        const calls = serve();
        const store = createLessonsStore("withoutRight");
        renderLessonsOnRoute(<Lessons />, store, "/lessons", "/lessons");

        expect(screen.getByText("გაკვეთილების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(startedQueries(store)).toEqual([]);
        expect(calls).toHaveLength(0);
    });

    it("waits for the menu and loads nothing meanwhile", () => {
        serve();
        const store = createLessonsStore("loading");
        renderLessonsOnRoute(<Lessons />, store, "/lessons", "/lessons");

        expect(screen.queryByText("გაკვეთილების ნახვის უფლება არ გაქვთ")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("ჯგუფი")).not.toBeInTheDocument();
        expect(startedQueries(store)).toEqual([]);
    });

    it("shows the load error", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Error", detail: "boom", status: 500 } }));
        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
