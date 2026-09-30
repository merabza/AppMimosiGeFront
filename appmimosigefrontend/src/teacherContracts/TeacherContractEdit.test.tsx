//TeacherContractEdit.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    createTeacherContractsStore,
    renderTeacherOnRoute,
    type TeacherContractsStore,
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

const contract8: ITeacherContract = { ...contract, id: 8, contractNumber: "T3.08", fixedAmount: 300 };

const pending = (): Promise<FetchReply> => new Promise<FetchReply>(() => {});

const badRequest = (title: string, detail: string): FetchReply => ({
    status: 400,
    body: { title, detail, status: 400 },
});

// change: the reply to POST, PUT and DELETE (a function: e.g. a reply that never comes)
function serve(
    change: FetchReply | ((call: FetchCall) => FetchReply | Promise<FetchReply>) = {
        status: 200,
        body: undefined,
    }
): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
        if (call.url.includes("/humans"))
            return { status: 200, body: [{ id: 3, name: "Gamma Gia" }] };
        if (call.method === "GET") {
            if (call.url.endsWith("/7")) return { status: 200, body: contract };
            if (call.url.endsWith("/8")) return { status: 200, body: contract8 };
            return { status: 404, body: {} };
        }
        if (typeof change === "function") return change(call);
        if (call.method === "POST" && change.status === 200) return { status: 200, body: 31 };
        return change;
    });
}

// navigates inside the page, so the editor stays mounted and only its route parameter changes
function GoTo({ to }: { to: string }) {
    const navigate = useNavigate();
    return <button onClick={() => navigate(to)}>go {to}</button>;
}

function renderEditor(
    url: string,
    menu: MenuState = "withRight",
    store: TeacherContractsStore = createTeacherContractsStore(menu)
) {
    const path = url === "/editor" ? "/editor" : "/editor/:id";
    return renderTeacherOnRoute(
        <>
            <TeacherContractEdit />
            <GoTo to="/editor/8" />
        </>,
        store,
        path,
        url
    );
}

const spinnerIn = (button: HTMLElement) => button.querySelector(".spinner-border");

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
        expect(screen.getByRole("button", { name: /შენახვა/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /შექმნა/ })).not.toBeInTheDocument();
        // the delete question is asked only after the delete button is pressed
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

    it("waits for the menu before loading anything", async () => {
        const calls = serve();

        renderEditor("/editor/7", "loading");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.queryByLabelText("კონტრაქტის ნომერი")).not.toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the lookups before showing the form", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups") ? pending() : { status: 200, body: contract }
        );

        renderEditor("/editor/7");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.queryByLabelText("კონტრაქტის ნომერი")).not.toBeInTheDocument();
    });

    it("titles a new contract and offers to create it", async () => {
        serve();

        renderEditor("/editor");

        expect(await screen.findByText("ახალი მასწავლებლის კონტრაქტი")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /შექმნა/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /შენახვა/ })).not.toBeInTheDocument();
        expect(screen.getByLabelText("განაცემის ყოველთვიური ფიქსირებული რაოდენობა")).toHaveValue(0);
        expect(screen.getByLabelText("მონაწილეობს საპენსიო სქემაში")).not.toBeChecked();
    });

    it("offers the lookups with an empty choice first", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        const optionTexts = (label: string) =>
            within(screen.getByLabelText(label))
                .getAllByRole("option")
                .map((option) => option.textContent);

        expect(optionTexts("ქვეყანა (საგადასახადოსათვის)")).toEqual([
            "-- აირჩიეთ --",
            "Armenia",
            "Georgia",
        ]);
        expect(optionTexts("განაცემის სახე (საგადასახადოსათვის)")).toEqual([
            "-- არ არის --",
            "Other",
            "Salary",
        ]);
        expect(
            optionTexts("ხელფასის ძირითადი სქემა საათობრივი ანაზღაურებისათვის")
        ).toEqual(["-- არ არის --", "Senior"]);
        expect(optionTexts("სამუშაო საათების ჯგუფი")).toEqual(["-- არ არის --", "ADM"]);
        expect(screen.getByLabelText("ქვეყანა (საგადასახადოსათვის)")).toBeRequired();
        expect(screen.getByLabelText("განაცემის სახე (საგადასახადოსათვის)")).not.toBeRequired();
    });

    it("lets the browser check the contract number format", async () => {
        serve();
        renderEditor("/editor/7");
        const number = await screen.findByLabelText("კონტრაქტის ნომერი");

        expect(number).toBeValid();
        expect(number).toBeRequired();
        expect(number).toHaveAttribute("placeholder", "T0.00");
        expect(number).toHaveAttribute("title", "ფორმატი T0.00, მაგალითად T3.01");
        expect(number).toHaveAttribute("maxLength", "5");

        fireEvent.change(number, { target: { value: "3.01" } });

        expect(number).toBeInvalid();
    });

    it("lets the browser check the dates, times, amount and text lengths", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        const contractDate = screen.getByLabelText("კონტრაქტის თარიღი");
        const endDate = screen.getByLabelText("კონტრაქტის დასრულების თარიღი");
        const amount = screen.getByLabelText("განაცემის ყოველთვიური ფიქსირებული რაოდენობა");
        expect(contractDate).toHaveAttribute("type", "date");
        expect(contractDate).toBeRequired();
        expect(endDate).toHaveAttribute("type", "date");
        expect(endDate).not.toBeRequired();
        // the end date may not be before the contract date
        expect(endDate).toHaveAttribute("min", "2025-09-01");
        expect(screen.getByLabelText("სამუშაოს დაწყება")).toHaveAttribute("type", "time");
        expect(screen.getByLabelText("სამუშაოს დასრულება")).toHaveAttribute("type", "time");
        expect(amount).toHaveAttribute("type", "number");
        expect(amount).toBeRequired();
        expect(amount).toHaveAttribute("min", "0");
        expect(amount).toHaveAttribute("step", "0.01");
        expect(screen.getByLabelText("ანგარიშის ნომერი")).toHaveAttribute("maxLength", "22");
        expect(screen.getByLabelText("ბანკის კოდი")).toHaveAttribute("maxLength", "8");
        const description = screen.getByLabelText("განაცემის შინაარსი (თუ ხელფასი არ არის)");
        expect(description).toHaveAttribute("maxLength", "255");
        expect(description).toHaveAttribute("placeholder", "ხელფასი");

        fireEvent.change(contractDate, { target: { value: "2025-10-05" } });

        expect(endDate).toHaveAttribute("min", "2025-10-05");
    });

    it("sends the changed flags, choices and texts", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        const change = (label: string, value: string) =>
            fireEvent.change(screen.getByLabelText(label), { target: { value } });

        fireEvent.click(screen.getByLabelText("მონაწილეობს საპენსიო სქემაში"));
        fireEvent.click(screen.getByLabelText("განაცემი ეკუთვნის შემდეგ თვეს"));
        change("კონტრაქტის ნომერი", "T3.17");
        change("კონტრაქტის თარიღი", "2025-09-02");
        change("ანგარიშის ნომერი", "");
        change("ბანკის კოდი", "BAGAGE22");
        change("განაცემის სახე (საგადასახადოსათვის)", "21");
        change("ქვეყანა (საგადასახადოსათვის)", "2");
        change("განაცემის ყოველთვიური ფიქსირებული რაოდენობა", "120.5");
        change("განაცემის შინაარსი (თუ ხელფასი არ არის)", "პრემია");
        change("ხელფასის ძირითადი სქემა საათობრივი ანაზღაურებისათვის", "");
        change("სამუშაო საათების ჯგუფი", "");
        change("სამუშაოს დასრულება", "19:00");
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)[0].body).toEqual({
            contractNumber: "T3.17",
            contractDate: "2025-09-02",
            teacherHumanId: 1,
            bankAccount: null,
            bankAccountCode: "BAGAGE22",
            pensionScheme: false,
            indEnt: false,
            rsQuoteTypeId: 21,
            rsCountryId: 2,
            fixedAmount: 120.5,
            nextMonth: false,
            description: "პრემია",
            salarySchemaByHoursId: null,
            workHourGroupId: null,
            workHoursStart: "12:00:00",
            workHoursEnd: "19:00:00",
            contractEndDate: null,
        });
    });

    it("goes back to the list without saving when closed", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)).toHaveLength(0);
    });

    it("disables saving and shows a spinner while the contract is being saved", async () => {
        serve(pending);
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        expect(saveButton()).toBeEnabled();
        expect(spinnerIn(saveButton())).toBeNull();

        fireEvent.click(saveButton());

        await waitFor(() => expect(saveButton()).toBeDisabled());
        expect(spinnerIn(saveButton())).not.toBeNull();
        expect(spinnerIn(screen.getByRole("button", { name: /წაშლა/ }))).toBeNull();
    });

    it("disables creating while the new contract is being created", async () => {
        serve(pending);
        renderEditor("/editor");
        fireEvent.change(await screen.findByLabelText("კონტრაქტის ნომერი"), {
            target: { value: "T3.12" },
        });
        const teacher = screen.getByLabelText("თანამშრომელი");
        fireEvent.focus(teacher);
        fireEvent.change(teacher, { target: { value: "ga" } });
        fireEvent.mouseDown(await screen.findByText("Gamma Gia"));
        fireEvent.change(screen.getByLabelText("ქვეყანა (საგადასახადოსათვის)"), {
            target: { value: "1" },
        });

        fireEvent.click(saveButton());

        await waitFor(() => expect(saveButton()).toBeDisabled());
    });

    it("asks before deleting and keeps the contract when not confirmed", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("იშლება მასწავლებლის კონტრაქტი")).toBeInTheDocument();
        expect(
            within(dialog).getByText(
                'დარწმუნებული ხართ, რომ გსურთ წაშალოთ კონტრაქტი "T3.07"?'
            )
        ).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "არა" }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(changes(calls)).toHaveLength(0);
        expect(screen.queryByText("list page")).not.toBeInTheDocument();
    });

    it("disables the delete button and shows a spinner while the contract is being deleted", async () => {
        serve(pending);
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        const deleteButton = () => screen.getByRole("button", { name: /წაშლა/ });
        expect(deleteButton()).toBeEnabled();
        expect(spinnerIn(deleteButton())).toBeNull();

        fireEvent.click(deleteButton());
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        await waitFor(() => expect(deleteButton()).toBeDisabled());
        expect(spinnerIn(deleteButton())).not.toBeNull();
        expect(spinnerIn(saveButton())).toBeNull();
    });

    it("asks again when deleting after a cancelled question", async () => {
        serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "არა" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("asks again when deleting after a refused delete", async () => {
        serve(conflict);
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));
        expect(await screen.findByText("კონტრაქტი გამოყენებულია")).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("loads the other contract when the route changes to it", async () => {
        serve();
        renderEditor("/editor/7");
        expect(await screen.findByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.07");

        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));

        await waitFor(() =>
            expect(screen.getByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.08")
        );
        expect(screen.getByLabelText("განაცემის ყოველთვიური ფიქსირებული რაოდენობა")).toHaveValue(300);
        expect(screen.getByText("მასწავლებლის კონტრაქტი T3.08")).toBeInTheDocument();
    });

    // a failed save reloads the contract (its tag is invalidated), but what was typed stays
    it("keeps the typed values when the save fails", async () => {
        const calls = serve(badRequest("FixedAmountMustNotBeNegative", "ფიქსირებული თანხა უარყოფითი ვერ იქნება"));
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        const description = screen.getByLabelText("განაცემის შინაარსი (თუ ხელფასი არ არის)");

        fireEvent.change(description, { target: { value: "პრემია" } });
        fireEvent.click(saveButton());

        expect(await screen.findByText("ფიქსირებული თანხა უარყოფითი ვერ იქნება")).toBeInTheDocument();
        await waitFor(() =>
            expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/7"))).toHaveLength(2)
        );
        await flush();
        expect(description).toHaveValue("პრემია");
    });

    it("does not show a save error left from before when a contract is opened", async () => {
        serve();
        const store = createTeacherContractsStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "ძველი შეცდომა" }]));

        renderEditor("/editor/7", "withRight", store);
        await screen.findByLabelText("კონტრაქტის ნომერი");

        expect(screen.queryByText("ძველი შეცდომა")).not.toBeInTheDocument();
    });

    it("shows only the error of the last save", async () => {
        let attempt = 0;
        serve(() =>
            attempt++ === 0
                ? badRequest("FirstError", "პირველი შეცდომა")
                : badRequest("SecondError", "მეორე შეცდომა")
        );
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(saveButton());
        expect(await screen.findByText("პირველი შეცდომა")).toBeInTheDocument();
        fireEvent.click(saveButton());

        expect(await screen.findByText("მეორე შეცდომა")).toBeInTheDocument();
        expect(screen.queryByText("პირველი შეცდომა")).not.toBeInTheDocument();
    });

    it("shows only the error of the delete after a failed save", async () => {
        let attempt = 0;
        serve(() =>
            attempt++ === 0
                ? badRequest("SaveError", "შენახვის შეცდომა")
                : badRequest("DeleteError", "წაშლის შეცდომა")
        );
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        fireEvent.click(saveButton());
        expect(await screen.findByText("შენახვის შეცდომა")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("წაშლის შეცდომა")).toBeInTheDocument();
        expect(screen.queryByText("შენახვის შეცდომა")).not.toBeInTheDocument();
    });

    it("clears the save error when another contract is opened", async () => {
        serve(badRequest("SaveError", "შენახვის შეცდომა"));
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        fireEvent.click(saveButton());
        expect(await screen.findByText("შენახვის შეცდომა")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));

        await waitFor(() =>
            expect(screen.getByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.08")
        );
        expect(screen.queryByText("შენახვის შეცდომა")).not.toBeInTheDocument();
    });

    it("does not show the previous contract while the next one loads", async () => {
        mockFetch((call) => {
            if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
            if (call.url.endsWith("/8")) return pending();
            return { status: 200, body: contract };
        });
        renderEditor("/editor/7");
        await screen.findByLabelText("კონტრაქტის ნომერი");

        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));

        await waitFor(() =>
            expect(screen.queryByLabelText("კონტრაქტის ნომერი")).not.toBeInTheDocument()
        );
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    // the cached contract is not trusted: it is loaded again and the fresh data is shown
    it("shows the fresh data when a contract is opened again", async () => {
        let loads7 = 0;
        const calls = mockFetch((call) => {
            if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
            if (call.url.endsWith("/8")) return { status: 200, body: contract8 };
            loads7++;
            return { status: 200, body: { ...contract, fixedAmount: loads7 === 1 ? 850.5 : 999 } };
        });
        renderTeacherOnRoute(
            <>
                <TeacherContractEdit />
                <GoTo to="/editor/8" />
                <GoTo to="/editor/7" />
            </>,
            createTeacherContractsStore(),
            "/editor/:id",
            "/editor/7"
        );
        const amount = () => screen.getByLabelText("განაცემის ყოველთვიური ფიქსირებული რაოდენობა");
        await screen.findByLabelText("კონტრაქტის ნომერი");
        expect(amount()).toHaveValue(850.5);
        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));
        await waitFor(() =>
            expect(screen.getByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.08")
        );

        fireEvent.click(screen.getByRole("button", { name: "go /editor/7" }));

        await waitFor(() => expect(amount()).toHaveValue(999));
        expect(screen.getByLabelText("კონტრაქტის ნომერი")).toHaveValue("T3.07");
        expect(calls.filter((c) => c.url.endsWith("/7"))).toHaveLength(2);
    });

    it("saves through the page instead of submitting the browser form", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        const number = await screen.findByLabelText("კონტრაქტის ნომერი");

        expect(fireEvent.submit(number.closest("form")!)).toBe(false);

        await waitFor(() => expect(changes(calls)).toHaveLength(1));
    });
});
