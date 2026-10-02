//WorkHourEdit.test.tsx

import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    createWorkHoursStore,
    renderWorkHoursOnRoute,
    workHourData,
    workHourLookups,
} from "../testUtils/workHoursTestStore";
import type { IWorkHour } from "../redux/types/workHoursTypes";
import { nowDateTimeInputValue, withSeconds } from "./workHourForm";
import WorkHourEdit from "./WorkHourEdit";

const listUrl = "/workHours?teacherContractId=1";

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

function serve(workHour: IWorkHour = workHourData(), change: ChangeReply = () => ({ status: 200, body: 77 })) {
    return mockFetch((call) => {
        if (call.method !== "GET") return change(call);
        if (call.url.includes("/formlookups")) return { status: 200, body: workHourLookups };
        return { status: 200, body: { ...workHour, id: Number(call.url.split("/").pop()) } };
    });
}

// the editor opened from the list (so "back" returns to the filtered list), or directly
function renderEditor(url: string, menu: MenuState = "withRight", fromList = true) {
    const store = createWorkHoursStore(menu);
    renderWorkHoursOnRoute(
        <WorkHourEdit />,
        store,
        url.startsWith("/workHourEdit/") ? "/workHourEdit/:whId" : "/workHourEdit",
        ...(fromList ? [listUrl, url] : [url])
    );
    return store;
}

const changes = (calls: FetchCall[]) => calls.filter((c) => c.method !== "GET");
const location = () => screen.getByTestId("location").textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const employee = () => field("თანამშრომელი");
const start = () => field("სამუშაოს დაწყება");
const end = () => field("სამუშაოს დასრულება");
const saveButton = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
//jsdom writes the value with milliseconds, a browser without zero seconds
const moment = (input: HTMLInputElement) => withSeconds(input.value);

describe("WorkHourEdit", () => {
    describe("a new record", () => {
        it("starts now, without an employee and an end", async () => {
            serve();
            renderEditor("/workHourEdit");

            expect(await screen.findByText("ახალი ჩანაწერი")).toBeInTheDocument();
            expect(employee()).toHaveValue("");
            //the minute may have turned since the form was filled
            expect(moment(start()).slice(0, 13)).toBe(nowDateTimeInputValue().slice(0, 13));
            expect(start()).toHaveAttribute("step", "1");
            expect(start()).toHaveAttribute("type", "datetime-local");
            expect(end()).toHaveAttribute("step", "1");
            expect(end()).toHaveAttribute("type", "datetime-local");
            expect(end()).toHaveValue("");
            expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
        });

        it("lists the employees", async () => {
            serve();
            renderEditor("/workHourEdit");
            await screen.findByText("ახალი ჩანაწერი");

            expect(within(employee()).getAllByRole("option").map((o) => o.textContent)).toEqual([
                "-- აირჩიეთ --",
                "Alpha Ann / T3.01",
                "Alpha Ann / T3.10",
                "Beta Bob / T3.05",
            ]);
        });

        it("creates the record and returns to the filtered list", async () => {
            const calls = serve();
            renderEditor("/workHourEdit");
            await screen.findByText("ახალი ჩანაწერი");

            fireEvent.change(employee(), { target: { value: "15" } });
            fireEvent.change(start(), { target: { value: "2026-09-30T09:00" } });
            fireEvent.change(end(), { target: { value: "2026-09-30T17:30:15" } });
            fireEvent.click(saveButton(/შექმნა/));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.split("/api/v1")[1], c.body])).toEqual([
                [
                    "POST",
                    "/workhours",
                    { teacherContractId: 15, whStart: "2026-09-30T09:00:00", whEnd: "2026-09-30T17:30:15" },
                ],
            ]);
        });

        // a record without an end is a started one
        it("creates a record without an end", async () => {
            const calls = serve();
            renderEditor("/workHourEdit", "withRight", false);
            await screen.findByText("ახალი ჩანაწერი");

            fireEvent.change(employee(), { target: { value: "1" } });
            fireEvent.click(saveButton(/შექმნა/));

            await waitFor(() => expect(location()).toBe("/workHours"));
            expect((changes(calls)[0].body as { whEnd: string | null }).whEnd).toBeNull();
        });

        it("is not sent without an employee", async () => {
            const calls = serve();
            renderEditor("/workHourEdit");
            await screen.findByText("ახალი ჩანაწერი");

            fireEvent.click(saveButton(/შექმნა/));

            expect(employee().matches(":invalid")).toBe(true);
            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/workHourEdit");
        });

        it("is not sent without a start", async () => {
            const calls = serve();
            renderEditor("/workHourEdit");
            await screen.findByText("ახალი ჩანაწერი");

            fireEvent.change(employee(), { target: { value: "1" } });
            fireEvent.change(start(), { target: { value: "" } });
            fireEvent.click(saveButton(/შექმნა/));

            expect(start().matches(":invalid")).toBe(true);
            expect(changes(calls)).toHaveLength(0);
        });
    });

    describe("an existing record", () => {
        it("loads the record into the form", async () => {
            const calls = serve();
            renderEditor("/workHourEdit/7");

            expect(await screen.findByText("ნამუშევარი დრო")).toBeInTheDocument();
            expect(employee()).toHaveValue("1");
            expect(moment(start())).toBe("2026-09-15T11:55:12");
            expect(moment(end())).toBe("2026-09-15T18:05:00");
            expect(calls.some((c) => c.url.endsWith("/workhours/7"))).toBe(true);
        });

        it("saves the changes and returns to the filtered list", async () => {
            const calls = serve(undefined, () => ({ status: 200 }));
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.change(end(), { target: { value: "2026-09-15T18:30" } });
            fireEvent.click(saveButton(/შენახვა/));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.split("/api/v1")[1], c.body])).toEqual([
                [
                    "PUT",
                    "/workhours/7",
                    { teacherContractId: 1, whStart: "2026-09-15T11:55:12", whEnd: "2026-09-15T18:30:00" },
                ],
            ]);
        });

        // clearing the end makes it a started record again
        it("sends a cleared end as null", async () => {
            const calls = serve(undefined, () => ({ status: 200 }));
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.change(end(), { target: { value: "" } });
            fireEvent.click(saveButton(/შენახვა/));

            await waitFor(() => expect(changes(calls)).toHaveLength(1));
            expect((changes(calls)[0].body as { whEnd: string | null }).whEnd).toBeNull();
        });

        it("fills an empty end for a record not ended yet", async () => {
            serve(workHourData({ whEnd: null }));
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            expect(end()).toHaveValue("");
        });

        // the end must be after the start (the server checks it too)
        it.each(["2026-09-15T11:55:12", "2026-09-15T10:00"])(
            "does not save an end (%s) not after the start",
            async (value) => {
                const calls = serve();
                renderEditor("/workHourEdit/7");
                await screen.findByText("ნამუშევარი დრო");

                fireEvent.change(end(), { target: { value } });

                expect(end()).toHaveClass("is-invalid");
                expect(screen.getByText("დასრულება დაწყებაზე გვიან უნდა იყოს")).toBeInTheDocument();
                expect(saveButton(/შენახვა/)).toBeDisabled();
                fireEvent.submit(end().closest("form")!);
                await screen.findByText("ნამუშევარი დრო");
                expect(changes(calls)).toHaveLength(0);
            }
        );

        it("shows the server's refusal and stays on the form", async () => {
            serve(undefined, () => ({
                status: 400,
                body: { title: "EmployeeNotFound", detail: "employee not found", status: 400 },
            }));
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.click(saveButton(/შენახვა/));

            expect(await screen.findByText("employee not found")).toBeInTheDocument();
            expect(location()).toBe("/workHourEdit/7");
        });

        it("deletes the record after the confirmation", async () => {
            const calls = serve(undefined, () => ({ status: 200 }));
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            expect(
                await screen.findByText("დარწმუნებული ხართ, რომ გსურთ წაშალოთ 15.09.2026 11:55-ის ჩანაწერი?")
            ).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.split("/api/v1")[1]])).toEqual([
                ["DELETE", "/workhours/7"],
            ]);
        });

        it("keeps the record when the deletion is cancelled", async () => {
            const calls = serve();
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));

            await waitFor(() =>
                expect(screen.queryByText(/დარწმუნებული ხართ/)).not.toBeInTheDocument()
            );
            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/workHourEdit/7");
        });

        it("closes back to the filtered list", async () => {
            serve();
            renderEditor("/workHourEdit/7");
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
        });

        it("closes to the list when opened directly", async () => {
            serve();
            renderEditor("/workHourEdit/7", "withRight", false);
            await screen.findByText("ნამუშევარი დრო");

            fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

            await waitFor(() => expect(location()).toBe("/workHours"));
        });
    });

    describe("while working", () => {
        // the change replies in turn; a missing one never arrives
        function serveChanges(...replies: FetchReply[]) {
            let next = 0;
            return serve(workHourData(), () =>
                next < replies.length ? replies[next++] : new Promise<FetchReply>(() => undefined)
            );
        }

        const refused = {
            status: 400,
            body: { title: "EmployeeNotFound", detail: "refused", status: 400 },
        };

        const button = (name: RegExp) => screen.getByRole("button", { name });

        async function openRecord() {
            renderEditor("/workHourEdit/7");
            await waitFor(() => expect(employee()).toHaveValue("1"));
        }

        // two records in one editor: the second one is answered by hand, so the loading in between can be seen
        function renderTwoRecords(
            eight: Promise<FetchReply> | FetchReply,
            change: ChangeReply = () => ({ status: 200 })
        ) {
            mockFetch((call) => {
                if (call.method !== "GET") return change(call);
                if (call.url.includes("/formlookups")) return { status: 200, body: workHourLookups };
                if (call.url.endsWith("/8")) return eight;
                return { status: 200, body: workHourData() };
            });
            render(
                <Provider store={createWorkHoursStore()}>
                    <MemoryRouter initialEntries={["/workHourEdit/7"]}>
                        <Routes>
                            <Route path="/workHourEdit/:whId" element={<WorkHourEdit />} />
                        </Routes>
                        <Link to="/workHourEdit/8">next</Link>
                    </MemoryRouter>
                </Provider>
            );
        }

        it("loads no record for a new one", async () => {
            const calls = serve();
            renderEditor("/workHourEdit");

            await screen.findByText("ახალი ჩანაწერი");
            expect(calls.some((c) => /\/workhours\/\d+$/.test(c.url))).toBe(false);
        });

        // the form is filled once per record, but another record opened in the same editor is loaded
        it("loads another record opened in the same editor", async () => {
            let answerEight: (reply: FetchReply) => void = () => undefined;
            renderTwoRecords(new Promise<FetchReply>((resolve) => (answerEight = resolve)));
            await waitFor(() => expect(employee()).toHaveValue("1"));
            fireEvent.change(employee(), { target: { value: "5" } });

            fireEvent.click(screen.getByText("next"));

            expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
            answerEight({
                status: 200,
                body: workHourData({ id: 8, teacherContractId: 15, whStart: "2026-09-16T09:00:00", whEnd: null }),
            });
            await waitFor(() => expect(employee()).toHaveValue("15"));
            expect(moment(start())).toBe("2026-09-16T09:00:00");
            expect(end()).toHaveValue("");
        });

        it("clears the change errors when another record is opened", async () => {
            renderTwoRecords({ status: 200, body: workHourData({ id: 8, teacherContractId: 15 }) }, () => refused);
            await waitFor(() => expect(employee()).toHaveValue("1"));
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(screen.getByText("next"));

            await waitFor(() => expect(employee()).toHaveValue("15"));
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("starts without the delete confirmation", async () => {
            serve();
            await openRecord();

            expect(screen.queryByRole("button", { name: "დიახ" })).not.toBeInTheDocument();
        });

        it("titles the delete confirmation", async () => {
            serve();
            await openRecord();

            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByText("იშლება ჩანაწერი")).toBeInTheDocument();
        });

        it("asks again after the deletion was declined", async () => {
            serveChanges();
            await openRecord();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));
            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());
            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
        });

        it("asks again after a refused deletion", async () => {
            serveChanges(refused);
            await openRecord();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
            await screen.findByText("refused");
            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
        });

        it("clears the old error when saving again", async () => {
            serveChanges(refused);
            await openRecord();
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("clears the old error when deleting again", async () => {
            serveChanges(refused);
            await openRecord();
            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
            await screen.findByText("refused");

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(button(/წაშლა/)).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("shows the spinner only on the save button while saving", async () => {
            serveChanges();
            await openRecord();
            expect(button(/შენახვა/).querySelector(".spinner-border")).toBeNull();

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(button(/შენახვა/).querySelector(".spinner-border")).not.toBeNull();
            expect(button(/წაშლა/).querySelector(".spinner-border")).toBeNull();
            expect(button(/წაშლა/)).not.toBeDisabled();
        });

        it("shows the spinner while a new record is created", async () => {
            const calls = serve(workHourData(), () => new Promise<FetchReply>(() => undefined));
            renderEditor("/workHourEdit");
            await screen.findByText("ახალი ჩანაწერი");
            fireEvent.change(employee(), { target: { value: "1" } });

            fireEvent.click(button(/შექმნა/));

            await waitFor(() => expect(button(/შექმნა/)).toBeDisabled());
            expect(button(/შექმნა/).querySelector(".spinner-border")).not.toBeNull();
            expect(changes(calls)).toHaveLength(1);
        });

        it("shows the spinner only on the delete button while deleting", async () => {
            serveChanges();
            await openRecord();
            expect(button(/წაშლა/).querySelector(".spinner-border")).toBeNull();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(button(/წაშლა/)).toBeDisabled());
            expect(button(/წაშლა/).querySelector(".spinner-border")).not.toBeNull();
            expect(button(/შენახვა/).querySelector(".spinner-border")).toBeNull();
            expect(button(/შენახვა/)).not.toBeDisabled();
        });

        // the page sends the record itself; the browser must not submit the form
        it("keeps the browser from submitting the form", async () => {
            serveChanges();
            await openRecord();
            const form = button(/შენახვა/).closest("form")!;

            const submit = createEvent.submit(form);
            fireEvent(form, submit);

            expect(submit.defaultPrevented).toBe(true);
        });
    });

    it("waits while the menu is loading", () => {
        serve();
        renderEditor("/workHourEdit", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });

    // an error left by another page is not shown here
    it("clears an old mutation error when it opens", async () => {
        serve();
        const store = createWorkHoursStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderWorkHoursOnRoute(<WorkHourEdit />, store, "/workHourEdit/:whId", "/workHourEdit/7");

        await screen.findByText("ნამუშევარი დრო");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
        expect(store.getState().alertState.alert.ApiMutation ?? []).toEqual([]);
    });

    it("tells a user without the menu item that the page is not theirs and loads nothing", async () => {
        const calls = serve();
        const store = renderEditor("/workHourEdit/7", "withoutRight");

        expect(await screen.findByText("სამუშაო საათების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().workHoursApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("tells when the record fails to load", async () => {
        mockFetch((call) =>
            call.url.includes("/formlookups")
                ? { status: 200, body: workHourLookups }
                : { status: 404, body: { title: "WorkHourNotFound", detail: "record not found", status: 404 } }
        );
        renderEditor("/workHourEdit/99");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        expect(screen.getByText("record not found")).toBeInTheDocument();
    });
});
