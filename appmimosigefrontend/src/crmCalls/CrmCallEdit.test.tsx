//CrmCallEdit.test.tsx

import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { requestedYear } from "../testUtils/paymentsTestStore";
import {
    createCrmCallsStore,
    crmCallData,
    crmCallLookups,
    crmYearContracts,
    renderCrmCallsOnRoute,
} from "../testUtils/crmCallsTestStore";
import type { ICrmCall } from "../redux/types/crmCallsTypes";
import { nowDateTimeInputValue } from "./crmCallForm";
import CrmCallEdit from "./CrmCallEdit";

const listUrl = "/crmCalls?answerTypeId=3";

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

function serve(crmCall: ICrmCall = crmCallData(), change: ChangeReply = () => ({ status: 200, body: 77 })) {
    return mockFetch((call) => {
        if (call.method !== "GET") return change(call);
        if (call.url.includes("/formlookups")) return { status: 200, body: crmCallLookups };
        if (call.url.includes("/studentcontracts"))
            return { status: 200, body: crmYearContracts[requestedYear(call.url)] ?? [] };
        return { status: 200, body: { ...crmCall, id: Number(call.url.split("/").pop()) } };
    });
}

// the editor opened from the list (so "back" returns to the filtered list), or directly
function renderEditor(url: string, menu: MenuState = "withRight", fromList = true) {
    const store = createCrmCallsStore(menu);
    renderCrmCallsOnRoute(
        <CrmCallEdit />,
        store,
        url.startsWith("/crmCallEdit/") ? "/crmCallEdit/:crmCallId" : "/crmCallEdit",
        ...(fromList ? [listUrl, url] : [url])
    );
    return store;
}

const changes = (calls: FetchCall[]) => calls.filter((c) => c.method !== "GET");
const location = () => screen.getByTestId("location").textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const studentInput = () => field("მოსწავლე (კონტრაქტი)");

async function chooseStudent(name: string) {
    fireEvent.focus(studentInput());
    fireEvent.mouseDown(await screen.findByText(name));
}

describe("CrmCallEdit", () => {
    describe("a new call", () => {
        // Access: the type defaults to the payment reminder and the date to now; the result is to be chosen
        it("starts now with the default type in the current year", async () => {
            serve();
            renderEditor("/crmCallEdit");

            expect(await screen.findByText("ახალი ზარი")).toBeInTheDocument();
            expect(field("ზარის ტიპი")).toHaveValue("1");
            //the minute may have turned since the form was filled
            expect(field("თარიღი და დრო").value.slice(0, 13)).toBe(nowDateTimeInputValue().slice(0, 13));
            expect(field("შედეგი")).toHaveValue("");
            expect(field("საუბრის შინაარსი")).toHaveValue("");
            expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveValue("");
            expect(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი")).toHaveValue("11");
            expect(studentInput()).toHaveValue("");
            expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
        });

        it("creates the call and returns to the filtered list", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            await chooseStudent("Beta Bob / 6.002");
            fireEvent.change(field("ზარის ტიპი"), { target: { value: "2" } });
            fireEvent.change(field("თარიღი და დრო"), { target: { value: "2026-09-30T18:05" } });
            fireEvent.change(field("შედეგი"), { target: { value: "3" } });
            fireEvent.change(field("საუბრის შინაარსი"), { target: { value: " will pay \n on Monday " } });
            fireEvent.change(field("უნდა გადაიხადოს თარიღამდე"), { target: { value: "2026-10-05" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls)).toHaveLength(1);
            expect(changes(calls)[0].method).toBe("POST");
            expect(changes(calls)[0].url.endsWith("/crmcalls")).toBe(true);
            expect(changes(calls)[0].body).toEqual({
                studentContractId: 11,
                callTypeId: 2,
                callDate: "2026-09-30T18:05:00",
                answerTypeId: 3,
                callConversation: "will pay \n on Monday",
                mustPayDate: "2026-10-05",
            });
        });

        it("goes to the list after creating when opened directly", async () => {
            serve();
            renderEditor("/crmCallEdit", "withRight", false);
            await screen.findByText("ახალი ზარი");

            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.change(field("შედეგი"), { target: { value: "2" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            await waitFor(() => expect(location()).toBe("/crmCalls"));
        });

        it("is not sent without a student", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            fireEvent.change(field("შედეგი"), { target: { value: "2" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/crmCallEdit");
        });

        // the result was required in Access
        it("is not sent without a result", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(field("შედეგი").matches(":invalid")).toBe(true);
            expect(changes(calls)).toHaveLength(0);
        });

        it("is not sent without a date", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.change(field("შედეგი"), { target: { value: "2" } });
            fireEvent.change(field("თარიღი და დრო"), { target: { value: "" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(changes(calls)).toHaveLength(0);
        });

        it("lists the types and the results by name", async () => {
            serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            const options = (label: string) =>
                Array.from((field(label) as unknown as HTMLSelectElement).options).map((o) => o.textContent);
            expect(options("ზარის ტიპი")).toEqual(["-- აირჩიეთ --", "Another", "Reminder"]);
            expect(options("შედეგი")).toEqual(["-- აირჩიეთ --", "Answered", "No answer", "Off"]);
        });

        it("clears the student when the year changes and lists that year's contracts", async () => {
            serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");
            await chooseStudent("Alpha Ann / 6.001");

            fireEvent.change(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი"), {
                target: { value: "10" },
            });

            expect(studentInput()).toHaveValue("");
            await chooseStudent("Gamma Gia / 6.001");
            expect(studentInput()).toHaveValue("Gamma Gia / 6.001");
        });

        it("shows the server's refusal and stays", async () => {
            serve(crmCallData(), () => ({
                status: 400,
                body: { title: "StudentContractNotFound", detail: "contract not found", status: 400 },
            }));
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");

            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.change(field("შედეგი"), { target: { value: "2" } });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(await screen.findByText("contract not found")).toBeInTheDocument();
            expect(location()).toBe("/crmCallEdit");
        });
    });

    describe("an existing call", () => {
        it("shows the call's fields", async () => {
            serve();
            renderEditor("/crmCallEdit/5");

            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));
            expect(screen.getByText("ზარი")).toBeInTheDocument();
            expect(studentInput()).toHaveValue("Alpha Ann / 6.001");
            expect(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი")).toHaveValue("11");
            expect(field("ზარის ტიპი")).toHaveValue("1");
            expect(field("თარიღი და დრო")).toHaveValue("2026-09-24T19:48");
            expect(field("საუბრის შინაარსი")).toHaveValue("will pay next week");
            expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveValue("2026-10-08");
        });

        // before the year's contracts arrive the name comes with the call
        it("shows a contract of another year by the call's name", async () => {
            serve(crmCallData({ studentContractId: 99, studentContractName: "Old Name / 5.001", academicYearId: 10 }));
            renderEditor("/crmCallEdit/5");

            await waitFor(() => expect(studentInput()).toHaveValue("Old Name / 5.001"));
        });

        it("saves the changes and returns to the list", async () => {
            const calls = serve(crmCallData(), () => ({ status: 200 }));
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));

            fireEvent.change(field("შედეგი"), { target: { value: "1" } });
            fireEvent.change(field("საუბრის შინაარსი"), { target: { value: "   " } });
            fireEvent.change(field("უნდა გადაიხადოს თარიღამდე"), { target: { value: "" } });
            fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls)[0].method).toBe("PUT");
            expect(changes(calls)[0].url.endsWith("/crmcalls/5")).toBe(true);
            expect(changes(calls)[0].body).toEqual({
                studentContractId: 10,
                callTypeId: 1,
                callDate: "2026-09-24T19:48:00",
                answerTypeId: 1,
                callConversation: null,
                mustPayDate: null,
            });
        });

        it("deletes the call after confirmation", async () => {
            const calls = serve(crmCallData(), () => ({ status: 200 }));
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            expect(
                await screen.findByText("დარწმუნებული ხართ, რომ გსურთ წაშალოთ 24.09.2026 19:48-ის ზარი?")
            ).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls).map((c) => [c.method, c.url.endsWith("/crmcalls/5")])).toEqual([["DELETE", true]]);
        });

        it("keeps the call when the deletion is not confirmed", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));

            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());
            expect(changes(calls)).toHaveLength(0);
            expect(location()).toBe("/crmCallEdit/5");
        });

        it("shows a failed deletion and stays", async () => {
            serve(crmCallData(), () => ({
                status: 404,
                body: { title: "CrmCallNotFound", detail: "call not found", status: 404 },
            }));
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));

            fireEvent.click(screen.getByRole("button", { name: /წაშლა/ }));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

            expect(await screen.findByText("call not found")).toBeInTheDocument();
            expect(location()).toBe("/crmCallEdit/5");
        });

        it("returns to the list without saving on close", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));

            fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

            await waitFor(() => expect(location()).toBe(listUrl));
            expect(changes(calls)).toHaveLength(0);
        });

        it("tells when the call fails to load", async () => {
            mockFetch((call) => {
                if (call.url.includes("/formlookups")) return { status: 200, body: crmCallLookups };
                return { status: 404, body: { title: "CrmCallNotFound", detail: "call not found", status: 404 } };
            });
            renderEditor("/crmCallEdit/5");

            expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
            expect(screen.getByText("call not found")).toBeInTheDocument();
        });
    });

    describe("while working", () => {
        // the change replies in turn; a missing one never arrives
        function serveChanges(...replies: FetchReply[]) {
            let next = 0;
            return serve(crmCallData(), () =>
                next < replies.length ? replies[next++] : new Promise<FetchReply>(() => {})
            );
        }

        const refused = {
            status: 400,
            body: { title: "AnswerTypeNotFound", detail: "refused", status: 400 },
        };

        const button = (name: RegExp) => screen.getByRole("button", { name });

        async function openCall() {
            renderEditor("/crmCallEdit/5");
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));
        }

        // two calls in one editor: the second one is answered by hand, so the loading in between can be seen
        function renderTwoCalls(six: Promise<FetchReply> | FetchReply, change: ChangeReply = () => ({ status: 200 })) {
            mockFetch((call) => {
                if (call.method !== "GET") return change(call);
                if (call.url.includes("/formlookups")) return { status: 200, body: crmCallLookups };
                if (call.url.includes("/studentcontracts"))
                    return { status: 200, body: crmYearContracts[requestedYear(call.url)] ?? [] };
                if (call.url.endsWith("/6")) return six;
                return { status: 200, body: crmCallData() };
            });
            render(
                <Provider store={createCrmCallsStore()}>
                    <MemoryRouter initialEntries={["/crmCallEdit/5"]}>
                        <Routes>
                            <Route path="/crmCallEdit/:crmCallId" element={<CrmCallEdit />} />
                        </Routes>
                        <Link to="/crmCallEdit/6">next</Link>
                    </MemoryRouter>
                </Provider>
            );
        }

        it("loads no call for a new one", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");

            await screen.findByText("ახალი ზარი");
            expect(calls.some((c) => /\/crmcalls\/\d+$/.test(c.url))).toBe(false);
        });

        it("loads no contracts for a new call when there is no current academic year", async () => {
            const calls = mockFetch((call) => {
                if (call.url.includes("/formlookups"))
                    return { status: 200, body: { ...crmCallLookups, currentAcademicYearId: null } };
                return { status: 200, body: [] };
            });
            renderEditor("/crmCallEdit");

            await screen.findByText("ახალი ზარი");
            expect(calls.some((c) => c.url.includes("/studentcontracts"))).toBe(false);
        });

        // the student of the other year is gone, so a student of the new year has to be chosen first
        it("is not sent after the year changed until a student is chosen", async () => {
            const calls = serve();
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");
            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.change(field("შედეგი"), { target: { value: "2" } });

            fireEvent.change(screen.getByLabelText("მოსწავლე (კონტრაქტი): სასწავლო წელი"), {
                target: { value: "10" },
            });
            fireEvent.click(screen.getByRole("button", { name: /შექმნა/ }));

            expect(changes(calls)).toHaveLength(0);
            expect(studentInput().validationMessage).toBe("აირჩიეთ მოსწავლის კონტრაქტი");
        });

        // the form is filled once per call, but another call opened in the same editor is loaded
        it("loads another call opened in the same editor", async () => {
            let answerSix: (reply: FetchReply) => void = () => {};
            renderTwoCalls(new Promise<FetchReply>((resolve) => (answerSix = resolve)));
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));
            fireEvent.change(field("შედეგი"), { target: { value: "1" } });

            fireEvent.click(screen.getByText("next"));

            expect(await screen.findByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
            answerSix({ status: 200, body: crmCallData({ id: 6, answerTypeId: 2, callConversation: "six" }) });
            await waitFor(() => expect(field("შედეგი")).toHaveValue("2"));
            expect(field("საუბრის შინაარსი")).toHaveValue("six");
        });

        it("clears the change errors when another call is opened", async () => {
            renderTwoCalls(
                { status: 200, body: crmCallData({ id: 6, answerTypeId: 2 }) },
                () => refused
            );
            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(screen.getByText("next"));

            await waitFor(() => expect(field("შედეგი")).toHaveValue("2"));
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        // an error left by another page is not shown on the call
        it("clears the change errors left from before", async () => {
            serve();
            const store = createCrmCallsStore();
            store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
            renderCrmCallsOnRoute(<CrmCallEdit />, store, "/crmCallEdit/:crmCallId", "/crmCallEdit/5");

            await waitFor(() => expect(field("შედეგი")).toHaveValue("3"));
            expect(screen.queryByText("old error")).not.toBeInTheDocument();
        });

        it("starts without the delete confirmation", async () => {
            serve();
            await openCall();

            expect(screen.queryByRole("button", { name: "დიახ" })).not.toBeInTheDocument();
        });

        it("asks again after the deletion was declined", async () => {
            serveChanges();
            await openCall();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));
            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());
            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
        });

        it("asks again after a refused deletion", async () => {
            serveChanges(refused);
            await openCall();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
            await screen.findByText("refused");
            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
        });

        it("titles the delete confirmation", async () => {
            serve();
            await openCall();

            fireEvent.click(button(/წაშლა/));

            expect(await screen.findByText("იშლება ზარი")).toBeInTheDocument();
        });

        it("clears the old error when saving again", async () => {
            serveChanges(refused);
            await openCall();
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("clears the old error when deleting again", async () => {
            serveChanges(refused);
            await openCall();
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
            await openCall();
            expect(button(/შენახვა/).querySelector(".spinner-border")).toBeNull();

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(button(/შენახვა/).querySelector(".spinner-border")).not.toBeNull();
            expect(button(/წაშლა/).querySelector(".spinner-border")).toBeNull();
            expect(button(/წაშლა/)).not.toBeDisabled();
        });

        it("shows the spinner while a new call is created", async () => {
            const calls = serve(crmCallData(), () => new Promise<FetchReply>(() => {}));
            renderEditor("/crmCallEdit");
            await screen.findByText("ახალი ზარი");
            await chooseStudent("Alpha Ann / 6.001");
            fireEvent.change(field("შედეგი"), { target: { value: "2" } });

            fireEvent.click(button(/შექმნა/));

            await waitFor(() => expect(button(/შექმნა/)).toBeDisabled());
            expect(button(/შექმნა/).querySelector(".spinner-border")).not.toBeNull();
            expect(changes(calls)).toHaveLength(1);
        });

        it("shows the spinner only on the delete button while deleting", async () => {
            serveChanges();
            await openCall();
            expect(button(/წაშლა/).querySelector(".spinner-border")).toBeNull();

            fireEvent.click(button(/წაშლა/));
            fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));

            await waitFor(() => expect(button(/წაშლა/)).toBeDisabled());
            expect(button(/წაშლა/).querySelector(".spinner-border")).not.toBeNull();
            expect(button(/შენახვა/).querySelector(".spinner-border")).toBeNull();
            expect(button(/შენახვა/)).not.toBeDisabled();
        });

        // the page sends the call itself; the browser must not submit the form
        it("keeps the browser from submitting the form", async () => {
            serveChanges();
            await openCall();
            const form = button(/შენახვა/).closest("form")!;

            const submit = createEvent.submit(form);
            fireEvent(form, submit);

            expect(submit.defaultPrevented).toBe(true);
        });
    });

    it("tells a role without the right and loads nothing", async () => {
        serve();
        const store = renderEditor("/crmCallEdit/5", "withoutRight");

        expect(await screen.findByText("CRM ზარების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().crmCallsApi.queries).toEqual({});
    });

    it("waits while the menu is loading", () => {
        serve();
        renderEditor("/crmCallEdit", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
    });
});
