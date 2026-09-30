//Groups.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall } from "../testUtils/testStore";
import {
    decodeFilterSortRequest,
    type MenuState,
} from "../testUtils/studentContractsTestStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import type { IGroupFormLookups, IGroupRow } from "../redux/types/groupsTypes";
import Groups from "./Groups";

const lookups: IGroupFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    courses: [{ id: 6, name: "Math" }],
    groupSizes: [{ id: 2, name: "4-Four" }],
    studentStatuses: [{ id: 10, name: "Tenth" }],
    teacherContracts: [],
    salarySchemes: [],
    weekDays: [],
    lessonStartTimes: [],
    rooms: [],
};

const groupRow: IGroupRow = {
    rowId: 7,
    grpId: 7,
    groupCode: "1001",
    academicYearName: "2026-2027",
    courseName: "Math",
    groupSizeName: "4-Four",
    studentStatusName: "Tenth",
    voidDate: null,
    dirtyLessons: true,
    teacherName: "Alpha Ann",
    activeStudentsCount: 3,
    studentName: null,
    startDate: null,
    endDate: null,
};

const teacherRow: IGroupRow = {
    ...groupRow,
    rowId: 12,
    teacherName: "Beta Bob",
    activeStudentsCount: null,
    startDate: "2026-09-20T00:00:00",
    endDate: "2027-06-01T00:00:00",
};

const studentRow: IGroupRow = {
    ...groupRow,
    rowId: 22,
    teacherName: null,
    activeStudentsCount: null,
    studentName: "Delta Dan",
    startDate: "2026-09-01T00:00:00",
    endDate: null,
};

// the rows of every find method, as the backend answers them
function serve(): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
        const findMethod = decodeFilterSortRequest(call.url).filterFields.find(
            (f) => f.fieldName === "findMethod"
        )?.value;
        const row =
            findMethod === "teacher" ? teacherRow : findMethod === "student" ? studentRow : groupRow;
        return { status: 200, body: { allRowsCount: 1, offset: 0, rows: [row] } };
    });
}

function renderList(menu: MenuState = "withRight") {
    return renderGroupsOnRoute(<Groups />, createGroupsStore(menu), "/list", "/list");
}

function lastRowsRequest(calls: FetchCall[]) {
    const requests = calls
        .filter((c) => c.url.includes("/groups/rowsdata"))
        .map((c) => decodeFilterSortRequest(c.url));
    return requests[requests.length - 1];
}

function rowCells(link: HTMLElement) {
    return within(link.closest("tr")!)
        .getAllByRole("cell")
        .map((cell) => cell.textContent);
}

// lets started requests reach the mocked fetch
async function flush() {
    for (let i = 0; i < 5; i++) await act(async () => {});
}

describe("Groups", () => {
    it("tells a user without the menu right that the list is not available", async () => {
        const calls = serve();

        renderList("withoutRight");
        await flush();

        expect(screen.getByText("ჯგუფების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the menu before loading anything", async () => {
        const calls = serve();

        renderList("loading");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("lists the active groups of the current year by group", async () => {
        const calls = serve();

        renderList();

        const link = await screen.findByRole("link", { name: "1001" });
        expect(link).toHaveAttribute("href", "/groupEdit/7");
        // row number, code, course, size, status, today's teacher and students, void date, dirty, year
        expect(rowCells(link)).toEqual([
            "1", "1001", "Math", "4-Four", "Tenth", "Alpha Ann", "3", "", "დიახ", "2026-2027",
        ]);
        expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("11");
        expect(screen.getByLabelText("მდგომარეობა")).toHaveValue("active");
        expect(screen.getByLabelText("ძებნის რეჟიმი")).toHaveValue("group");
        expect(screen.getByLabelText("ძებნა")).toHaveAttribute("placeholder", "ჯგუფის კოდი");
        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([
                { fieldName: "findMethod", value: "group" },
                { fieldName: "academicYearId", value: "11" },
                { fieldName: "state", value: "active" },
            ])
        );
    });

    it("offers a link to a new group", async () => {
        serve();

        renderList();

        expect(await screen.findByRole("link", { name: /ახალი/ })).toHaveAttribute(
            "href",
            "/groupEdit"
        );
    });

    // Access cmbFindMethod 2: the teacher's period in every group, sorted by the teacher
    it("finds the groups of a teacher with the teacher's periods", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "1001" });

        fireEvent.change(screen.getByLabelText("ძებნის რეჟიმი"), {
            target: { value: "teacher" },
        });
        fireEvent.change(screen.getByLabelText("ძებნა"), { target: { value: "Beta" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls)).toMatchObject({
                offset: 0,
                sortByFields: [],
                filterFields: [
                    { fieldName: "findMethod", value: "teacher" },
                    { fieldName: "academicYearId", value: "11" },
                    { fieldName: "state", value: "active" },
                    { fieldName: "search", value: "Beta" },
                ],
            })
        );
        const link = await screen.findByRole("link", { name: "1001" });
        await waitFor(() =>
            expect(rowCells(link)).toEqual([
                "1", "Beta Bob", "1001", "Math", "4-Four", "20.09.2026", "01.06.2027",
            ])
        );
        expect(link).toHaveAttribute("href", "/groupEdit/7");
        expect(screen.getByLabelText("ძებნა")).toHaveAttribute(
            "placeholder",
            "მასწავლებლის გვარი, სახელი"
        );
    });

    // Access cmbFindMethod 3: the student's period in every group
    it("finds the groups of a student with the student's periods", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "1001" });

        fireEvent.change(screen.getByLabelText("ძებნის რეჟიმი"), {
            target: { value: "student" },
        });

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields[0]).toEqual({
                fieldName: "findMethod",
                value: "student",
            })
        );
        await waitFor(() =>
            expect(rowCells(screen.getByRole("link", { name: "1001" }))).toEqual([
                "1", "Delta Dan", "1001", "Math", "4-Four", "01.09.2026", "",
            ])
        );
        expect(screen.getByLabelText("ძებნა")).toHaveAttribute(
            "placeholder",
            "მოსწავლის გვარი, სახელი"
        );
    });

    it("reloads from the first page with the chosen filters", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "1001" });

        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "" } });
        fireEvent.change(screen.getByLabelText("მდგომარეობა"), { target: { value: "voided" } });
        fireEvent.change(screen.getByLabelText("საგანი"), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText("ზომა"), { target: { value: "2" } });
        fireEvent.change(screen.getByLabelText("მოსწავლის სტატუსი"), {
            target: { value: "10" },
        });
        fireEvent.change(screen.getByLabelText("ძებნა"), { target: { value: " 10 " } });

        await waitFor(() =>
            expect(lastRowsRequest(calls)).toMatchObject({
                offset: 0,
                filterFields: [
                    { fieldName: "findMethod", value: "group" },
                    { fieldName: "state", value: "voided" },
                    { fieldName: "courseId", value: "6" },
                    { fieldName: "groupSizeId", value: "2" },
                    { fieldName: "studentStatusId", value: "10" },
                    { fieldName: "search", value: "10" },
                ],
            })
        );
    });

    it("lists every group when all states are chosen", async () => {
        const calls = serve();
        renderList();
        await screen.findByRole("link", { name: "1001" });

        fireEvent.change(screen.getByLabelText("მდგომარეობა"), { target: { value: "" } });

        await waitFor(() =>
            expect(lastRowsRequest(calls)?.filterFields).toEqual([
                { fieldName: "findMethod", value: "group" },
                { fieldName: "academicYearId", value: "11" },
            ])
        );
    });

    it("shows the load error of the lookups", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Error", detail: "fail", status: 500 } }));

        renderList();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
