//TeacherContractEdit.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    createTeacherContractsStore,
    renderTeacherOnRoute,
} from "../testUtils/teacherContractsTestStore";
import type {
    ITeacherContract,
    ITeacherContractFormLookups,
} from "../redux/types/teacherContractsTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import TeacherContractEdit from "./TeacherContractEdit";

const lookups: ITeacherContractFormLookups = {
    rsQuoteTypes: [
        { id: 21, name: "Other" },
        { id: 1, name: "Salary" },
    ],
    rsCountries: [
        { id: 2, name: "Armenia" },
        { id: 1, name: "Georgia" },
    ],
    salarySchemes: [{ id: 4, name: "Senior" }],
    workHourGroups: [{ id: 5, name: "ADM" }],
};

const contract: ITeacherContract = {
    id: 7,
    contractNumber: "T3.07",
    contractDate: "2025-09-01T00:00:00",
    teacherHumanId: 1,
    teacherName: "Alpha Ann",
    bankAccount: "GE00TB0000000000000000",
    bankAccountCode: "TBCBGE22",
    pensionScheme: true,
    indEnt: false,
    rsQuoteTypeId: 1,
    rsCountryId: 1,
    fixedAmount: 850.5,
    nextMonth: true,
    description: null,
    salarySchemaByHoursId: 4,
    workHourGroupId: 5,
    workHoursStart: "12:00:00",
    workHoursEnd: "18:30:00",
    contractEndDate: null,
};

const conflict: FetchReply = {
    status: 409,
    body: { title: "TeacherContractIsInUse", detail: "კონტრაქტი გამოყენებულია", status: 409 },
};

// change: the reply to POST, PUT and DELETE
function serve(change: FetchReply = { status: 200, body: undefined }): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
        if (call.url.includes("/humans"))
            return { status: 200, body: [{ id: 3, name: "Gamma Gia" }] };
        if (call.method === "GET")
            return call.url.endsWith("/7")
                ? { status: 200, body: contract }
                : { status: 404, body: {} };
        if (call.method === "POST" && change.status === 200) return { status: 200, body: 31 };
        return change;
    });
}

function renderEditor(url: string, menu: MenuState = "withRight") {
    const path = url === "/editor" ? "/editor" : "/editor/:id";
    return renderTeacherOnRoute(
        <TeacherContractEdit />,
        createTeacherContractsStore(menu),
        path,
        url
    );
}

function changes(calls: FetchCall[]) {
    return calls.filter((c) => c.method !== "GET");
}

// lets started requests reach the mocked fetch
async function flush() {
    for (let i = 0; i < 5; i++) await act(async () => {});
}

const saveButton = () => screen.getByRole("button", { name: /შენახვა|შექმნა/ });

describe("TeacherContractEdit", () => {
    it("tells a user without the menu right that the page is not available", async () => {
        const calls = serve();

        renderEditor("/editor/7", "withoutRight");
        await flush();

        expect(
            screen.getByText("მასწავლებლების კონტრაქტების ნახვის უფლება არ გაქვთ")
        ).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("shows the contract with Georgian captions from the Access descriptions", async () => {
        serve();

        renderEditor("/editor/7");

        expect(await screen.findByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.07");
        expect(screen.getByLabelText("კონტრაქტის თარიღი")).toHaveValue("2025-09-01");
        expect(screen.getByLabelText("თანამშრომელი")).toHaveValue("Alpha Ann");
        expect(screen.getByLabelText("ანგარიშის ნომერი")).toHaveValue("GE00TB0000000000000000");
        expect(screen.getByLabelText("ბანკის კოდი")).toHaveValue("TBCBGE22");
        expect(screen.getByLabelText("მონაწილეობს საპენსიო სქემაში")).toBeChecked();
        expect(screen.getByLabelText("ინდივიდუალური მეწარმე")).not.toBeChecked();
        expect(screen.getByLabelText("განაცემის სახე (საგადასახადოსათვის)")).toHaveValue("1");
        expect(screen.getByLabelText("ქვეყანა (საგადასახადოსათვის)")).toHaveValue("1");
        expect(
            screen.getByLabelText("განაცემის ყოველთვიური ფიქსირებული რაოდენობა")
        ).toHaveValue(850.5);
        expect(screen.getByLabelText("განაცემი ეკუთვნის შემდეგ თვეს")).toBeChecked();
        expect(screen.getByLabelText("განაცემის შინაარსი (თუ ხელფასი არ არის)")).toHaveValue("");
        expect(
            screen.getByLabelText("ხელფასის ძირითადი სქემა საათობრივი ანაზღაურებისათვის")
        ).toHaveValue("4");
        expect(screen.getByLabelText("სამუშაო საათების ჯგუფი")).toHaveValue("5");
        expect(screen.getByLabelText("სამუშაოს დაწყება")).toHaveValue("12:00");
        expect(screen.getByLabelText("სამუშაოს დასრულება")).toHaveValue("18:30");
        expect(screen.getByLabelText("კონტრაქტის დასრულების თარიღი")).toHaveValue("");
        expect(screen.getByText("მასწავლებლის კონტრაქტი T3.07")).toBeInTheDocument();
    });

    it("saves the changed contract and returns to the list", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.change(screen.getByLabelText("კონტრაქტის დასრულების თარიღი"), {
            target: { value: "2027-06-30" },
        });
        fireEvent.click(screen.getByLabelText("ინდივიდუალური მეწარმე"));
        fireEvent.change(screen.getByLabelText("სამუშაოს დაწყება"), {
            target: { value: "" },
        });
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        const [put] = changes(calls);
        expect(put.method).toBe("PUT");
        expect(put.url).toMatch(/\/teachercontracts\/7$/);
        expect(put.body).toMatchObject({
            contractNumber: "T3.07",
            indEnt: true,
            workHoursStart: null,
            workHoursEnd: "18:30:00",
            contractEndDate: "2027-06-30",
            rsCountryId: 1,
        });
    });

    it("creates a new contract with the chosen employee", async () => {
        const calls = serve();
        renderEditor("/editor");

        const number = await screen.findByLabelText("კონტრაქტის ნომერი");
        expect(screen.getByLabelText("კონტრაქტის თარიღი")).toHaveValue(todayDateInputValue());
        expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
        fireEvent.change(number, { target: { value: "T3.12" } });
        const teacher = screen.getByLabelText("თანამშრომელი");
        fireEvent.focus(teacher);
        fireEvent.change(teacher, { target: { value: "ga" } });
        fireEvent.mouseDown(await screen.findByText("Gamma Gia"));
        fireEvent.change(screen.getByLabelText("ქვეყანა (საგადასახადოსათვის)"), {
            target: { value: "1" },
        });
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        // the employee search goes through the teacher contracts endpoint (its own menu right)
        expect(calls.some((c) => c.url.includes("/teachercontracts/humans?search=ga"))).toBe(true);
        const [post] = changes(calls);
        expect(post.method).toBe("POST");
        expect(post.body).toMatchObject({
            contractNumber: "T3.12",
            teacherHumanId: 3,
            rsCountryId: 1,
            fixedAmount: 0,
            rsQuoteTypeId: null,
            workHoursStart: null,
        });
    });

    it("shows the server error and stays on the page", async () => {
        serve({
            status: 400,
            body: {
                title: "WorkHoursStartMustBeBeforeEnd",
                detail: "სამუშაოს დაწყების დრო დასრულების დროზე ადრე უნდა იყოს",
                status: 400,
            },
        });
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(saveButton());

        await waitFor(() => expect(screen.queryByText("list page")).not.toBeInTheDocument());
        expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("does not delete a contract in use and shows why", async () => {
        const calls = serve(conflict);
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        await waitFor(() => expect(changes(calls)).toHaveLength(1));
        expect(changes(calls)[0].method).toBe("DELETE");
        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.queryByText("list page")).not.toBeInTheDocument();
    });

    it("deletes a free contract after confirmation", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)[0].url).toMatch(/\/teachercontracts\/7$/);
    });

    it("shows the load error of a missing contract", async () => {
        serve();

        renderEditor("/editor/99");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
