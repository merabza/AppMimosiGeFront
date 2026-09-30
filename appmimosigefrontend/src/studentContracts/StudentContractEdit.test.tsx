//StudentContractEdit.test.tsx

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import {
    createStudentContractsStore,
    renderOnRoute,
    type MenuState,
    type StudentContractsStore,
} from "../testUtils/studentContractsTestStore";
import type {
    IStudentContract,
    IStudentContractFormLookups,
} from "../redux/types/studentContractsTypes";
import { studentContractsApi } from "../redux/api/studentContractsApi";
import StudentContractEdit from "./StudentContractEdit";
import { todayDateInputValue } from "./dateFormat";

const lookups: IStudentContractFormLookups = {
    currentAcademicYearId: 11,
    academicYears: [
        { id: 10, name: "2025-2026" },
        { id: 11, name: "2026-2027" },
    ],
    studentStatuses: [{ id: 9, name: "IX class" }],
    courses: [
        { id: 5, name: "Math" },
        { id: 6, name: "Art" },
    ],
    groupSizes: [{ id: 2, name: "4-Group" }],
};

const contract: IStudentContract = {
    scId: 7,
    contractNumber: "6.007",
    contractDate: "2026-09-01T00:00:00",
    studentHumanId: 1,
    studentName: "Alpha Ann",
    payerHumanId: 2,
    payerName: "Beta Bob",
    academicYearId: 11,
    studentStatusId: 9,
    desiredMonthlyPaymentDay: 15,
    nextPayDate: "2026-10-01T16:30:00",
    dirtyNextPayDate: true,
    details: [
        {
            id: 100,
            courseId: 5,
            groupSizeId: 2,
            fourWeekHours: 8,
            fourWeekFee: 48,
            oneHourFee: 6,
        },
    ],
};

const contract8: IStudentContract = { ...contract, scId: 8, contractNumber: "6.008" };

const conflict: FetchReply = {
    status: 409,
    body: { title: "StudentContractIsInUse", detail: "კონტრაქტი გამოყენებულია", status: 409 },
};

const pending = (): Promise<FetchReply> => new Promise<FetchReply>(() => {});

type Replies = {
    // GET of one contract by its id
    contracts?: Record<string, FetchReply | (() => Promise<FetchReply>)>;
    // POST, PUT and DELETE, in call order (the last one repeats)
    changes?: (FetchReply | (() => Promise<FetchReply>))[];
};

function serve(replies: Replies = {}): FetchCall[] {
    let changeIndex = 0;
    const contracts = replies.contracts ?? {
        "7": { status: 200, body: contract },
        "8": { status: 200, body: contract8 },
    };
    return mockFetch((call) => {
        if (call.url.includes("/formlookups")) return { status: 200, body: lookups };
        if (call.url.includes("/humans"))
            return { status: 200, body: [{ id: 3, name: "Gamma Gia" }] };
        if (call.method === "GET") {
            const reply = contracts[call.url.split("/").pop()!] ?? { status: 404, body: {} };
            return typeof reply === "function" ? reply() : reply;
        }
        const changes = replies.changes;
        if (!changes) return { status: 200, body: call.method === "POST" ? 128 : undefined };
        const reply = changes[Math.min(changeIndex++, changes.length - 1)];
        return typeof reply === "function" ? reply() : reply;
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
    store: StudentContractsStore = createStudentContractsStore(menu)
) {
    const path = url === "/editor" ? "/editor" : "/editor/:scId";
    return renderOnRoute(
        <>
            <StudentContractEdit />
            <GoTo to="/editor/8" />
        </>,
        store,
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

async function choosePerson(label: string | RegExp) {
    const field = screen.getByLabelText(label);
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "ga" } });
    fireEvent.mouseDown(await screen.findByText("Gamma Gia"));
}

const saveButton = () => screen.getByRole("button", { name: /შენახვა|შექმნა/ });
const deleteButton = () => screen.getByRole("button", { name: /^\s*წაშლა/ });

async function confirmDelete(answer: "დიახ" | "არა") {
    fireEvent.click(deleteButton());
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: answer }));
}

describe("StudentContractEdit", () => {
    it("tells a user without the menu right that contracts are not available", async () => {
        const calls = serve();

        renderEditor("/editor", "withoutRight");
        await flush();

        expect(
            screen.getByText("მოსწავლეების კონტრაქტების ნახვის უფლება არ გაქვთ")
        ).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("starts a new contract with today, the current year and the Access default rate", async () => {
        const calls = serve();

        renderEditor("/editor");

        expect(await screen.findByText("ახალი მოსწავლის კონტრაქტი")).toBeInTheDocument();
        await flush();
        expect(screen.getByLabelText("თარიღი")).toHaveValue(todayDateInputValue());
        expect(screen.getByLabelText("სასწ. წელი")).toHaveValue("11");
        expect(screen.getByLabelText("4 კვირის საათები 1")).toHaveValue(8);
        expect(screen.getByLabelText("4 კვირის გადასახადი 1")).toHaveValue(48);
        expect(screen.getByLabelText("საათის ღირებულება 1")).toHaveValue(6);
        expect(screen.queryByRole("button", { name: /^\s*წაშლა/ })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "იხდის თვითონ" })).toBeDisabled();
        expect(screen.queryByText(/შემდეგი გადახდის თარიღი/)).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(saveButton()).toBeEnabled();
        expect(saveButton()).toHaveTextContent("შექმნა");
        // a new contract has nothing to load
        expect(calls.filter((c) => c.method === "GET" && !c.url.includes("/formlookups"))).toHaveLength(0);
    });

    it("shows the rate columns with their input steps", async () => {
        serve();
        renderEditor("/editor");
        await screen.findByText("ახალი მოსწავლის კონტრაქტი");

        for (const caption of ["4 კვირის საათები", "4 კვირის გადასახადი", "საათის ღირებულება"])
            expect(screen.getByRole("columnheader", { name: caption })).toBeInTheDocument();
        expect(screen.getByLabelText("4 კვირის საათები 1")).toHaveAttribute("step", "0.5");
        // money has 4 decimals, so the fee fields take any value
        expect(screen.getByLabelText("4 კვირის გადასახადი 1")).toHaveAttribute("step", "any");
        expect(screen.getByLabelText("საათის ღირებულება 1")).toHaveAttribute("step", "any");
    });

    it("creates the contract with the student as payer and returns to the list", async () => {
        const calls = serve();
        renderEditor("/editor");
        await screen.findByText("ახალი მოსწავლის კონტრაქტი");

        fireEvent.change(screen.getByLabelText("კ. N"), { target: { value: "6.200" } });
        fireEvent.change(screen.getByLabelText("თარიღი"), { target: { value: "2026-09-20" } });
        fireEvent.change(screen.getByLabelText("სასწ. წელი"), { target: { value: "10" } });
        fireEvent.change(screen.getByLabelText("მოსწავლის სტატუსი"), { target: { value: "9" } });
        fireEvent.change(screen.getByLabelText("გადახდის სასურველი დღე"), { target: { value: "15" } });
        await choosePerson("მოსწავლე");
        fireEvent.click(screen.getByRole("button", { name: "იხდის თვითონ" }));
        fireEvent.change(screen.getByLabelText("საგანი 1"), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText("ჯგუფის ზომა 1"), { target: { value: "2" } });
        fireEvent.submit(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        const [create] = changes(calls);
        expect(create.method).toBe("POST");
        expect(create.body).toEqual({
            contractNumber: "6.200",
            contractDate: "2026-09-20",
            studentHumanId: 3,
            payerHumanId: 3,
            academicYearId: 10,
            studentStatusId: 9,
            desiredMonthlyPaymentDay: 15,
            details: [
                { id: 0, courseId: 6, groupSizeId: 2, fourWeekHours: 8, fourWeekFee: 48, oneHourFee: 6 },
            ],
        });
    });

    it("takes a payer chosen separately from the student", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await choosePerson(/გადამხდელი/);
        fireEvent.submit(saveButton());

        await screen.findByText("list page");
        expect(changes(calls)[0].body).toMatchObject({ studentHumanId: 1, payerHumanId: 3 });
    });

    it("does not let the browser submit the form itself", async () => {
        serve({ changes: [pending] });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        expect(fireEvent.submit(saveButton())).toBe(false);
    });

    it("disables saving while the save runs", async () => {
        serve({ changes: [pending] });
        renderEditor("/editor");
        await screen.findByText("ახალი მოსწავლის კონტრაქტი");
        expect(saveButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.submit(saveButton());

        await waitFor(() => expect(saveButton()).toBeDisabled());
        expect(saveButton().querySelector(".spinner-border")).not.toBeNull();
    });

    it("disables saving while an update runs", async () => {
        serve({ changes: [pending] });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.submit(saveButton());

        await waitFor(() => expect(saveButton()).toBeDisabled());
    });

    it("keeps the form and shows the server error when saving fails", async () => {
        serve({ changes: [conflict] });
        renderEditor("/editor");
        await screen.findByText("ახალი მოსწავლის კონტრაქტი");

        fireEvent.change(screen.getByLabelText("კ. N"), { target: { value: "6.200" } });
        fireEvent.submit(saveButton());

        expect(await screen.findByText("კონტრაქტი გამოყენებულია")).toBeInTheDocument();
        expect(screen.getByLabelText("კ. N")).toHaveValue("6.200");
        expect(saveButton()).toBeEnabled();
    });

    it("shows only the error of the last save attempt", async () => {
        serve({
            changes: [
                { status: 400, body: { title: "First", detail: "first error", status: 400 } },
                { status: 400, body: { title: "Second", detail: "second error", status: 400 } },
            ],
        });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.submit(saveButton());
        await screen.findByText("first error");
        fireEvent.submit(saveButton());

        expect(await screen.findByText("second error")).toBeInTheDocument();
        expect(screen.queryByText("first error")).not.toBeInTheDocument();
    });

    it("loads an existing contract into the form", async () => {
        serve();

        renderEditor("/editor/7");

        expect(await screen.findByText("მოსწავლის კონტრაქტი 6.007")).toBeInTheDocument();
        expect(screen.getByLabelText("კ. N")).toHaveValue("6.007");
        expect(screen.getByLabelText("თარიღი")).toHaveValue("2026-09-01");
        expect(screen.getByLabelText("მოსწავლე")).toHaveValue("Alpha Ann");
        expect(screen.getByLabelText(/გადამხდელი/)).toHaveValue("Beta Bob");
        expect(screen.getByLabelText("მოსწავლის სტატუსი")).toHaveValue("9");
        expect(screen.getByLabelText("გადახდის სასურველი დღე")).toHaveValue(15);
        expect(screen.getByLabelText("საგანი 1")).toHaveValue("5");
        expect(
            screen.getByText(/01\.10\.2026 16:30.*საჭიროებს გადაანგარიშებას/)
        ).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(deleteButton().querySelector(".spinner-border")).toBeNull();
        expect(saveButton()).toHaveTextContent("შენახვა");
    });

    it("shows a dash when there is no next payment date", async () => {
        serve({
            contracts: {
                "7": { status: 200, body: { ...contract, nextPayDate: null, dirtyNextPayDate: false } },
            },
        });

        renderEditor("/editor/7");

        expect(await screen.findByText("შემდეგი გადახდის თარიღი: —")).toBeInTheDocument();
    });

    // the second load returns changed data: the form must show it, not the copy cached by the first load
    it("loads the contract again every time the page opens and shows the fresh data", async () => {
        let loads7 = 0;
        const calls = serve({
            contracts: {
                "7": () =>
                    Promise.resolve({
                        status: 200,
                        body: { ...contract, desiredMonthlyPaymentDay: ++loads7 === 1 ? 15 : 20 },
                    }),
            },
        });
        const store = createStudentContractsStore();
        const first = renderEditor("/editor/7", "withRight", store);
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");
        expect(screen.getByLabelText("გადახდის სასურველი დღე")).toHaveValue(15);
        first.unmount();
        // closing and opening again take at least a tick (a list page, a click), so the cache drops
        // the closed contract before it is opened again
        await waitFor(() =>
            expect(
                studentContractsApi.endpoints.getStudentContract.select(7)(store.getState())
                    .isUninitialized
            ).toBe(true)
        );

        renderEditor("/editor/7", "withRight", store);
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await waitFor(() =>
            expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/7"))).toHaveLength(2)
        );
        await waitFor(() => expect(screen.getByLabelText("გადახდის სასურველი დღე")).toHaveValue(20));
    });

    it("shows the fresh data when the editor returns to a contract it showed before", async () => {
        let loads7 = 0;
        const calls = serve({
            contracts: {
                "7": () =>
                    Promise.resolve({
                        status: 200,
                        body: { ...contract, desiredMonthlyPaymentDay: ++loads7 === 1 ? 15 : 20 },
                    }),
                "8": { status: 200, body: contract8 },
            },
        });
        renderOnRoute(
            <>
                <StudentContractEdit />
                <GoTo to="/editor/8" />
                <GoTo to="/editor/7" />
            </>,
            createStudentContractsStore(),
            "/editor/:scId",
            "/editor/7"
        );
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");
        expect(screen.getByLabelText("გადახდის სასურველი დღე")).toHaveValue(15);
        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));
        await screen.findByText("მოსწავლის კონტრაქტი 6.008");

        fireEvent.click(screen.getByRole("button", { name: "go /editor/7" }));

        await screen.findByText("მოსწავლის კონტრაქტი 6.007");
        await waitFor(() => expect(screen.getByLabelText("გადახდის სასურველი დღე")).toHaveValue(20));
        expect(calls.filter((c) => c.method === "GET" && c.url.endsWith("/7"))).toHaveLength(2);
    });

    it("switches to another contract without reusing the previous form", async () => {
        serve({ changes: [conflict] });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");
        fireEvent.submit(saveButton());
        await screen.findByText("კონტრაქტი გამოყენებულია");

        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));

        expect(await screen.findByText("მოსწავლის კონტრაქტი 6.008")).toBeInTheDocument();
        expect(screen.getByLabelText("კ. N")).toHaveValue("6.008");
        expect(screen.queryByText("კონტრაქტი გამოყენებულია")).not.toBeInTheDocument();
    });

    it("shows the loading indicator instead of the previous contract while the next one loads", async () => {
        serve({ contracts: { "7": { status: 200, body: contract }, "8": pending } });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.click(screen.getByRole("button", { name: "go /editor/8" }));
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.queryByLabelText("კ. N")).not.toBeInTheDocument();
    });

    it("recalculates the rate when a fee field is left, and saves the changes", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        const fee = await screen.findByLabelText("4 კვირის გადასახადი 1");

        fireEvent.change(fee, { target: { value: "60" } });
        fireEvent.blur(fee);
        const hours = screen.getByLabelText("4 კვირის საათები 1");
        fireEvent.change(hours, { target: { value: "12" } });
        fireEvent.blur(hours);
        fireEvent.submit(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        const [update] = changes(calls);
        expect(update.method).toBe("PUT");
        expect(update.url).toMatch(/\/studentcontracts\/7$/);
        // 60 / 8 = 7.5 per hour, then 12 hours x 7.5 = 90
        expect(update.body).toMatchObject({
            contractNumber: "6.007",
            payerHumanId: 2,
            details: [{ id: 100, fourWeekHours: 12, fourWeekFee: 90, oneHourFee: 7.5 }],
        });
    });

    // money is stored with 4 decimals (SQL money): the browser's own check of the form, which the save button
    // runs (fireEvent.submit skips it), must not refuse such a rate
    it("saves a loaded rate with four decimals through the save button", async () => {
        const calls = serve({
            contracts: {
                "7": {
                    status: 200,
                    body: {
                        ...contract,
                        details: [
                            { ...contract.details[0], fourWeekHours: 18, fourWeekFee: 300, oneHourFee: 16.6667 },
                        ],
                    },
                },
            },
        });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)[0].body).toMatchObject({
            details: [{ id: 100, fourWeekHours: 18, fourWeekFee: 300, oneHourFee: 16.6667 }],
        });
    });

    it("saves a recalculated rate with four decimals through the save button", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        const hours = await screen.findByLabelText("4 კვირის საათები 1");

        fireEvent.change(hours, { target: { value: "9" } });
        fireEvent.blur(hours);
        const fee = screen.getByLabelText("4 კვირის გადასახადი 1");
        fireEvent.change(fee, { target: { value: "48" } });
        fireEvent.blur(fee);
        fireEvent.click(saveButton());

        expect(await screen.findByText("list page")).toBeInTheDocument();
        // 48 / 9 = 5.3333 per hour
        expect(changes(calls)[0].body).toMatchObject({
            details: [{ id: 100, fourWeekHours: 9, fourWeekFee: 48, oneHourFee: 5.3333 }],
        });
    });

    it("adds and removes rates, changing only the edited row", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByLabelText("საგანი 1");

        fireEvent.click(screen.getByRole("button", { name: /ტარიფის დამატება/ }));
        fireEvent.change(screen.getByLabelText("საგანი 1"), { target: { value: "6" } });
        expect(screen.getByLabelText("საგანი 2")).toHaveValue("");
        fireEvent.click(screen.getAllByTitle("ტარიფის წაშლა")[0]);
        fireEvent.change(screen.getByLabelText("საგანი 1"), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText("ჯგუფის ზომა 1"), { target: { value: "2" } });
        fireEvent.submit(saveButton());

        await screen.findByText("list page");
        expect(changes(calls)[0].body).toMatchObject({
            details: [{ id: 0, courseId: 6, groupSizeId: 2, fourWeekHours: 8, fourWeekFee: 48, oneHourFee: 6 }],
        });
    });

    it("deletes after confirmation and returns to the list", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.click(deleteButton());
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText(/"6.007"/)).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "დიახ" }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls).map((c) => [c.method, c.url.split("/").pop()])).toEqual([["DELETE", "7"]]);
    });

    it("disables deleting while the delete runs", async () => {
        serve({ changes: [pending] });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await confirmDelete("დიახ");

        await waitFor(() => expect(deleteButton()).toBeDisabled());
        expect(deleteButton().querySelector(".spinner-border")).not.toBeNull();
    });

    it("can ask again after the confirmation was declined", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await confirmDelete("არა");
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(changes(calls)).toHaveLength(0);

        fireEvent.click(deleteButton());

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("shows why a contract in use cannot be deleted and can ask again", async () => {
        serve({ changes: [conflict] });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await confirmDelete("დიახ");

        expect(await screen.findByText("კონტრაქტი გამოყენებულია")).toBeInTheDocument();
        expect(screen.queryByText("list page")).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        fireEvent.click(deleteButton());
        expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("shows only the error of the last delete attempt", async () => {
        serve({
            changes: [
                { status: 409, body: { title: "First", detail: "first error", status: 409 } },
                { status: 409, body: { title: "Second", detail: "second error", status: 409 } },
            ],
        });
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        await confirmDelete("დიახ");
        await screen.findByText("first error");
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        await confirmDelete("დიახ");

        expect(await screen.findByText("second error")).toBeInTheDocument();
        expect(screen.queryByText("first error")).not.toBeInTheDocument();
    });

    it("closes without saving", async () => {
        const calls = serve();
        renderEditor("/editor/7");
        await screen.findByText("მოსწავლის კონტრაქტი 6.007");

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(await screen.findByText("list page")).toBeInTheDocument();
        expect(changes(calls)).toHaveLength(0);
    });

    it("shows the load error of a missing contract", async () => {
        serve({
            contracts: {
                "99": { status: 404, body: { title: "StudentContractNotFound", detail: "not found", status: 404 } },
            },
        });

        renderEditor("/editor/99");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getByText("not found")).toBeInTheDocument();
    });
});
