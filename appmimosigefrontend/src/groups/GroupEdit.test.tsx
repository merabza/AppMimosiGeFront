//GroupEdit.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import type {
    IGroup,
    IGroupFormLookups,
    IGroupStudentContractLookup,
} from "../redux/types/groupsTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import GroupEdit from "./GroupEdit";

const lookups: IGroupFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    courses: [
        { id: 6, name: "Math" },
        { id: 7, name: "English" },
    ],
    groupSizes: [
        { id: 1, name: "2-Pair" },
        { id: 2, name: "4-Four" },
    ],
    studentStatuses: [{ id: 10, name: "Tenth" }],
    teacherContracts: [
        { id: 5, name: "Alpha Ann / T3.01", salarySchemaByHoursId: 8 },
        { id: 6, name: "Beta Bob / T3.02", salarySchemaByHoursId: 11 },
    ],
    salarySchemes: [
        { id: 8, name: "10.00-12.50" },
        { id: 11, name: "8.00-10.00" },
    ],
    weekDays: [
        { id: 1, name: "ორშაბათი" },
        { id: 3, name: "ოთხშაბათი" },
    ],
    lessonStartTimes: [
        { id: 17, name: "16:00" },
        { id: 19, name: "17:00" },
    ],
    rooms: [
        { id: 1, name: "1" },
        { id: 2, name: "2" },
    ],
};

const group: IGroup = {
    grpId: 7,
    academicYearId: 11,
    groupCode: "1001",
    courseId: 6,
    groupSizeId: 2,
    studentStatusId: 10,
    voidDate: null,
    dirtyLessons: false,
    teachers: [
        {
            id: 100,
            teacherContractId: 5,
            salarySchemaId: 8,
            startDate: "2026-09-01T00:00:00",
            endDate: null,
        },
    ],
    students: [
        {
            id: 200,
            studentContractId: 20,
            studentContractName: "Gamma Gia / 6.001",
            fourWeekHours: 12,
            fourWeekFee: 70,
            oneHourFee: 5.8333,
            hoursCoefficient: 1,
            startDate: "2026-09-01T00:00:00",
            endDate: null,
            note: null,
        },
        {
            id: 201,
            studentContractId: 99,
            studentContractName: "Omega Oto / 5.001",
            fourWeekHours: 8,
            fourWeekFee: 48,
            oneHourFee: 6,
            hoursCoefficient: 1,
            startDate: "2026-09-01T00:00:00",
            endDate: "2026-10-01T00:00:00",
            note: "last year's contract",
        },
    ],
    dayTimePlaces: [
        {
            id: 300,
            weekDayId: 3,
            lessonStartTimeId: 17,
            hoursCount: 1.5,
            roomId: 2,
            startDate: "2026-09-01T00:00:00",
            endDate: null,
        },
    ],
};

//the contracts of year 11; contract 21 has a tariff for Math (6) in a four-seated group (2)
const studentContracts: IGroupStudentContractLookup[] = [
    { scId: 21, name: "Delta Dan / 6.002", tariffs: [
        { id: 1, courseId: 6, groupSizeId: 1, fourWeekHours: 8, fourWeekFee: 80, oneHourFee: 10 },
        { id: 2, courseId: 6, groupSizeId: 2, fourWeekHours: 12, fourWeekFee: 72, oneHourFee: 6 },
    ] },
    { scId: 20, name: "Gamma Gia / 6.001", tariffs: [] },
];

const conflict: FetchReply = {
    status: 409,
    body: { title: "GroupIsInUse", detail: "ჯგუფს უკვე აქვს გაკვეთილები", status: 409 },
};

// change: the reply to POST, PUT and DELETE
function serve(change: FetchReply = { status: 200, body: undefined }): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: call.url.endsWith("=11") ? studentContracts : [] };
        if (call.method === "GET")
            return call.url.endsWith("/7") ? { status: 200, body: group } : { status: 404, body: {} };
        if (call.method === "POST" && change.status === 200) return { status: 200, body: 52 };
        return change;
    });
}

function renderEditor(url: string, menu: MenuState = "withRight") {
    const path = url === "/editor" ? "/editor" : "/editor/:grpId";
    return renderGroupsOnRoute(<GroupEdit />, createGroupsStore(menu), path, url);
}

function changes(calls: FetchCall[]) {
    return calls.filter((c) => c.method !== "GET");
}

// lets started requests reach the mocked fetch
async function flush() {
    for (let i = 0; i < 5; i++) await act(async () => {});
}

const saveButton = () => screen.getByRole("button", { name: /შენახვა|შექმნა/ });
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const change = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("GroupEdit", () => {
    it("tells a user without the menu right that the page is not available", async () => {
        const calls = serve();

        renderEditor("/editor/7", "withoutRight");
        await flush();

        expect(screen.getByText("ჯგუფების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the menu before loading anything", async () => {
        const calls = serve();

        renderEditor("/editor/7", "loading");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("shows the group with its teachers, students and schedule in tabs", async () => {
        serve();

        renderEditor("/editor/7");

        expect(await screen.findByLabelText("ჯგუფის კოდი")).toHaveValue("1001");
        expect(screen.getByText("ჯგუფი 1001")).toBeInTheDocument();
        expect(screen.getByLabelText("სასწ. წელი")).toHaveValue("11");
        expect(screen.getByLabelText("საგანი")).toHaveValue("6");
        expect(screen.getByLabelText("ჯგუფის ზომა")).toHaveValue("2");
        expect(screen.getByLabelText("მოსწავლის სტატუსი")).toHaveValue("10");
        expect(screen.getByLabelText("გაუქმება")).toHaveValue("");
        //DirtyLessons is shown only
        const dirty = screen.getByLabelText("საჭიროებს გაკვეთილების დაზუსტებას");
        expect(dirty).not.toBeChecked();
        expect(dirty).toBeDisabled();
        expect(tab(/მასწავლებლები \(1\)/)).toHaveAttribute("aria-selected", "true");
        expect(tab(/მოსწავლეები \(2\)/)).toBeInTheDocument();
        expect(tab(/განრიგი \(1\)/)).toBeInTheDocument();
        expect(screen.getByLabelText("მასწავლებელი 1")).toHaveValue("5");
        expect(screen.getByLabelText("ხელფასის სქემა 1")).toHaveValue("8");
        expect(screen.getByLabelText("მასწავლებლის დაწყება 1")).toHaveValue("2026-09-01");
        expect(screen.getByLabelText("მასწავლებლის დასრულება 1")).toHaveAttribute(
            "min",
            "2026-09-02"
        );
        expect(screen.getByLabelText("4 კვირის გადასახადი 1")).toHaveValue(70);
        expect(screen.getByLabelText("საათის ღირებულება 1")).toHaveValue(5.8333);
        expect(screen.getByLabelText("შენიშვნა 2")).toHaveValue("last year's contract");
        expect(screen.getByLabelText("კვირის დღე 1")).toHaveValue("3");
        expect(screen.getByLabelText("დაწყების დრო 1")).toHaveValue("17");
        expect(screen.getByLabelText("საათები 1")).toHaveValue(1.5);
        expect(screen.getByLabelText("ოთახი 1")).toHaveValue("2");
    });

    // the contracts of the group's year are offered; one of another year keeps its own name
    it("offers the student contracts of the group's year", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        await waitFor(() =>
            expect(
                within(screen.getByLabelText("მოსწავლე 1"))
                    .getAllByRole("option")
                    .map((o) => o.textContent)
            ).toEqual(["-- აირჩიეთ --", "Delta Dan / 6.002", "Gamma Gia / 6.001"])
        );
        expect(calls.some((c) => c.url.endsWith("/groups/studentcontracts?academicYearId=11"))).toBe(
            true
        );
        expect(screen.getByLabelText("მოსწავლე 2")).toHaveValue("99");
        expect(
            within(screen.getByLabelText("მოსწავლე 2")).getByRole("option", {
                name: "Omega Oto / 5.001",
            })
        ).toBeInTheDocument();
    });

    // Access TeacherContractID_Change
    it("sets the scheme of the chosen teacher contract", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        change("მასწავლებელი 1", "6");

        expect(screen.getByLabelText("ხელფასის სქემა 1")).toHaveValue("11");
    });

    // the tariff of the contract detail with the group's course and size
    it("fills the tariff of a chosen student contract", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");
        fireEvent.click(tab(/მოსწავლეები/));
        fireEvent.click(screen.getByRole("button", { name: /მოსწავლის დამატება/ }));
        await waitFor(() =>
            expect(within(screen.getByLabelText("მოსწავლე 3")).getAllByRole("option")).toHaveLength(3)
        );

        change("მოსწავლე 3", "21");

        expect(screen.getByLabelText("4 კვირის საათები 3")).toHaveValue(12);
        expect(screen.getByLabelText("4 კვირის გადასახადი 3")).toHaveValue(72);
        expect(screen.getByLabelText("საათის ღირებულება 3")).toHaveValue(6);
        expect(screen.getByLabelText("მოსწავლის დაწყება 3")).toHaveValue(todayDateInputValue());
    });

    // the recalculation of the contract details (part 06), when a field is left
    it("recalculates the tariff when a fee field is left", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        change("4 კვირის საათები 1", "10");
        fireEvent.blur(screen.getByLabelText("4 კვირის საათები 1"));
        expect(screen.getByLabelText("4 კვირის გადასახადი 1")).toHaveValue(58.333);

        change("4 კვირის გადასახადი 1", "60");
        fireEvent.blur(screen.getByLabelText("4 კვირის გადასახადი 1"));
        expect(screen.getByLabelText("საათის ღირებულება 1")).toHaveValue(6);

        change("საათის კოეფიციენტი 1", "2");
        fireEvent.blur(screen.getByLabelText("საათის კოეფიციენტი 1"));
        expect(screen.getByLabelText("4 კვირის გადასახადი 1")).toHaveValue(60);
    });

    it("saves the changed group with all its rows and returns to the list", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        change("ჯგუფის კოდი", " 1002 ");
        change("გაუქმება", "2027-06-01");
        change("მასწავლებლის დასრულება 1", "2026-10-01");
        fireEvent.click(screen.getByRole("button", { name: /მასწავლებლის დამატება/ }));
        change("მასწავლებელი 2", "6");
        change("მასწავლებლის დაწყება 2", "2026-10-01");
        fireEvent.click(screen.getAllByTitle("მოსწავლის წაშლა ჯგუფიდან")[1]);
        change("შენიშვნა 1", " new ");
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        const [put] = changes(calls);
        expect(put.method).toBe("PUT");
        expect(put.url).toMatch(/\/groups\/7$/);
        expect(put.body).toEqual({
            academicYearId: 11,
            groupCode: "1002",
            courseId: 6,
            groupSizeId: 2,
            studentStatusId: 10,
            voidDate: "2027-06-01",
            teachers: [
                { id: 100, teacherContractId: 5, salarySchemaId: 8, startDate: "2026-09-01", endDate: "2026-10-01" },
                { id: 0, teacherContractId: 6, salarySchemaId: 11, startDate: "2026-10-01", endDate: null },
            ],
            students: [
                {
                    id: 200,
                    studentContractId: 20,
                    fourWeekHours: 12,
                    fourWeekFee: 70,
                    oneHourFee: 5.8333,
                    hoursCoefficient: 1,
                    startDate: "2026-09-01",
                    endDate: null,
                    note: "new",
                },
            ],
            dayTimePlaces: [
                { id: 300, weekDayId: 3, lessonStartTimeId: 17, hoursCount: 1.5, roomId: 2, startDate: "2026-09-01", endDate: null },
            ],
        });
    });

    // generator error 5; the user chose to block the save (Access did not)
    it("marks overlapping teachers and does not save them", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByRole("button", { name: /მასწავლებლის დამატება/ }));
        change("მასწავლებელი 2", "6");
        change("მასწავლებლის დაწყება 2", "2026-10-01");

        expect(screen.getByText(/ერთ დღეს ჯგუფს ორი მასწავლებელი ვერ ეყოლება/)).toBeInTheDocument();
        expect(screen.getByLabelText("მასწავლებელი 1").closest("tr")).toHaveClass("table-danger");
        expect(screen.getByLabelText("მასწავლებელი 2").closest("tr")).toHaveClass("table-danger");
        fireEvent.click(tab(/განრიგი/));
        fireEvent.click(saveButton());
        await flush();

        expect(changes(calls)).toHaveLength(0);
        expect(tab(/მასწავლებლები/)).toHaveAttribute("aria-selected", "true");

        change("მასწავლებლის დასრულება 1", "2026-10-01");
        expect(screen.queryByText(/ერთ დღეს ჯგუფს ორი მასწავლებელი/)).not.toBeInTheDocument();
        fireEvent.click(saveButton());
        await waitFor(() => expect(changes(calls)).toHaveLength(1));
    });

    // generator error 7
    it("marks two schedules of one week day with overlapping periods and does not save them", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");
        fireEvent.click(tab(/განრიგი/));

        fireEvent.click(screen.getByRole("button", { name: /განრიგის დამატება/ }));
        change("კვირის დღე 2", "3");
        change("დაწყების დრო 2", "19");
        change("ოთახი 2", "1");
        change("განრიგის დაწყება 2", "2026-09-15");

        expect(screen.getByText(/ერთ კვირის დღეზე ჯგუფს ორი განრიგი ვერ ექნება/)).toBeInTheDocument();
        fireEvent.click(tab(/მასწავლებლები/));
        fireEvent.click(saveButton());
        await flush();
        expect(changes(calls)).toHaveLength(0);
        expect(tab(/განრიგი/)).toHaveAttribute("aria-selected", "true");

        change("კვირის დღე 2", "1");
        expect(screen.queryByText(/ერთ კვირის დღეზე ჯგუფს ორი განრიგი/)).not.toBeInTheDocument();
    });

    // the form is noValidate: a missing field of a hidden tab opens that tab instead of failing silently
    it("opens the tab of a missing required field instead of saving", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");
        fireEvent.click(tab(/მოსწავლეები/));
        fireEvent.click(screen.getByRole("button", { name: /მოსწავლის დამატება/ }));
        fireEvent.click(tab(/მასწავლებლები/));

        fireEvent.click(saveButton());
        await flush();

        expect(changes(calls)).toHaveLength(0);
        expect(tab(/მოსწავლეები/)).toHaveAttribute("aria-selected", "true");
        expect(screen.getByLabelText("მოსწავლე 3")).toHaveFocus();
    });

    it("does not save an end that is not after the start", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");
        fireEvent.click(tab(/განრიგი/));
        change("განრიგის დასრულება 1", "2026-09-01");
        fireEvent.click(tab(/მასწავლებლები/));

        fireEvent.click(saveButton());
        await flush();

        expect(changes(calls)).toHaveLength(0);
        expect(tab(/განრიგი/)).toHaveAttribute("aria-selected", "true");
    });

    it("creates a new group in the current year with the Access defaults", async () => {
        const calls = serve();
        renderEditor("/editor");

        const code = await screen.findByLabelText("ჯგუფის კოდი");
        expect(screen.getByText("ახალი ჯგუფი")).toBeInTheDocument();
        expect(screen.getByLabelText("სასწ. წელი")).toHaveValue("11");
        expect(screen.getByLabelText("ჯგუფის ზომა")).toHaveValue("2");
        expect(tab(/მასწავლებლები \(0\)/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "წაშლა" })).not.toBeInTheDocument();
        expect(screen.queryByLabelText("საჭიროებს გაკვეთილების დაზუსტებას")).not.toBeInTheDocument();
        fireEvent.change(code, { target: { value: "1011" } });
        change("საგანი", "7");
        change("მოსწავლის სტატუსი", "10");
        fireEvent.click(screen.getByRole("button", { name: /მასწავლებლის დამატება/ }));
        change("მასწავლებელი 1", "5");
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        const [post] = changes(calls);
        expect(post.method).toBe("POST");
        expect(post.body).toEqual({
            academicYearId: 11,
            groupCode: "1011",
            courseId: 7,
            groupSizeId: 2,
            studentStatusId: 10,
            voidDate: null,
            teachers: [
                {
                    id: 0,
                    teacherContractId: 5,
                    salarySchemaId: 8,
                    startDate: todayDateInputValue(),
                    endDate: null,
                },
            ],
            students: [],
            dayTimePlaces: [],
        });
    });

    it("shows the server error and stays on the page", async () => {
        serve({
            status: 409,
            body: { title: "GroupStudentIsInUse", detail: "მოსწავლეს უკვე აქვს გაკვეთილები", status: 409 },
        });
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(saveButton());

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.queryByText("list page")).not.toBeInTheDocument();
    });

    it("does not delete a group with lessons and shows why", async () => {
        const calls = serve(conflict);
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByRole("button", { name: "წაშლა" }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        await waitFor(() => expect(changes(calls)).toHaveLength(1));
        expect(changes(calls)[0].method).toBe("DELETE");
        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.queryByText("list page")).not.toBeInTheDocument();
    });

    it("deletes a group after confirmation", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByRole("button", { name: "წაშლა" }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)[0].url).toMatch(/\/groups\/7$/);
    });

    it("keeps the group when the delete question is answered no", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByRole("button", { name: "წაშლა" }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "არა" }));
        await flush();

        expect(changes(calls)).toHaveLength(0);
    });

    it("returns to the list without saving when closed", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)).toHaveLength(0);
    });

    it("shows the load error of a missing group", async () => {
        serve();

        renderEditor("/editor/99");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    it("removes schedule and teacher rows from the form", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("ჯგუფის კოდი");

        fireEvent.click(screen.getByTitle("მასწავლებლის წაშლა"));
        fireEvent.click(screen.getByTitle("განრიგის სტრიქონის წაშლა"));
        expect(tab(/მასწავლებლები \(0\)/)).toBeInTheDocument();
        expect(tab(/განრიგი \(0\)/)).toBeInTheDocument();
        fireEvent.click(saveButton());

        await waitFor(() => expect(changes(calls)).toHaveLength(1));
        expect(changes(calls)[0].body).toMatchObject({ teachers: [], dayTimePlaces: [] });
    });
});
