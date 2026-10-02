//CrmCallDialog.test.tsx

import { createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { decodeFilterSortRequest } from "../testUtils/studentContractsTestStore";
import {
    createCrmCallsStore,
    crmCallLookups,
    crmCallRow,
    renderCrmCallsOnRoute,
} from "../testUtils/crmCallsTestStore";
import type { ICrmCallsRowsData } from "../redux/types/crmCallsTypes";
import { nowDateTimeInputValue } from "./crmCallForm";
import CrmCallDialog from "./CrmCallDialog";

const contract = { studentContractId: 10, academicYearId: 11, name: "Alpha Ann / 6.001" };

const history: ICrmCallsRowsData = {
    allRowsCount: 2,
    offset: 0,
    rows: [
        crmCallRow({ id: 7, callDate: "2026-09-30T10:05:00", answerTypeName: "No answer", callConversation: null, mustPayDate: null }),
        crmCallRow(),
    ],
};

type Replies = {
    rows?: () => FetchReply | Promise<FetchReply>;
    create?: () => FetchReply | Promise<FetchReply>;
};

function serve(replies: Replies = {}): FetchCall[] {
    return mockFetch((call) => {
        if (call.method === "POST") return replies.create?.() ?? { status: 200, body: 77 };
        if (call.url.includes("/formlookups")) return { status: 200, body: crmCallLookups };
        return replies.rows?.() ?? { status: 200, body: history };
    });
}

function renderDialog() {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderCrmCallsOnRoute(
        <CrmCallDialog contract={contract} onClose={onClose} onSaved={onSaved} />,
        createCrmCallsStore(),
        "/deposits",
        "/deposits"
    );
    return { onClose, onSaved };
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const posts = (calls: FetchCall[]) => calls.filter((c) => c.method === "POST");
const historyRequests = (calls: FetchCall[]) =>
    calls.filter((c) => c.url.includes("/rowsdata")).map((c) => decodeFilterSortRequest(c.url));

describe("CrmCallDialog", () => {
    // Access opened the calls form filtered to the row's contract, the new call with the default type
    it("starts a call to the row's contract with the default type, now", async () => {
        serve();
        renderDialog();

        expect(await screen.findByText("ზარი: Alpha Ann / 6.001")).toBeInTheDocument();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));
        expect(field("თარიღი და დრო").value.slice(0, 13)).toBe(nowDateTimeInputValue().slice(0, 13));
        expect(field("შედეგი")).toHaveValue("");
        expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveValue("");
    });

    it("shows the contract's last calls, the latest first", async () => {
        const calls = serve();
        renderDialog();

        const table = await screen.findByTestId("crmCallsHistory");
        const lines = within(table)
            .getAllByRole("row")
            .slice(1)
            .map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
        expect(lines).toEqual([
            ["30.09.2026 10:05", "No answer", "", ""],
            ["24.09.2026 19:48", "Answered", "will pay next week", "08.10.2026"],
        ]);
        expect(historyRequests(calls)[0]).toEqual({
            offset: 0,
            rowsCount: 5,
            filterFields: [{ fieldName: "studentContractId", value: "10" }],
            sortByFields: [{ fieldName: "callDate", ascending: false }],
        });
        //every call is shown: no link to more
        expect(screen.queryByRole("link", { name: /ყველა ზარი/ })).not.toBeInTheDocument();
    });

    it("links to every call of the contract when there are more", async () => {
        serve({ rows: () => ({ status: 200, body: { ...history, allRowsCount: 8 } }) });
        renderDialog();

        expect(await screen.findByRole("link", { name: "ყველა ზარი (8)" })).toHaveAttribute(
            "href",
            "/crmCalls?academicYearId=11&studentContractId=10"
        );
    });

    it("says when the contract has no calls yet", async () => {
        serve({ rows: () => ({ status: 200, body: { allRowsCount: 0, offset: 0, rows: [] } }) });
        renderDialog();

        expect(await screen.findByText("ამ კონტრაქტზე ზარი ჯერ არ ყოფილა")).toBeInTheDocument();
    });

    it("waits for the lookups and the calls", async () => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        renderDialog();

        expect(await screen.findAllByText("მიმდინარეობს ჩატვირთვა...")).toHaveLength(2);
        expect(screen.getByRole("button", { name: /შენახვა/ })).toBeDisabled();
    });

    it("saves the call to the contract and tells the page", async () => {
        const calls = serve();
        const { onSaved, onClose } = renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));

        fireEvent.change(field("თარიღი და დრო"), { target: { value: "2026-10-01T11:20" } });
        fireEvent.change(field("შედეგი"), { target: { value: "3" } });
        fireEvent.change(field("საუბრის შინაარსი"), { target: { value: "will pay" } });
        fireEvent.change(field("უნდა გადაიხადოს თარიღამდე"), { target: { value: "2026-10-08" } });
        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(onClose).not.toHaveBeenCalled();
        expect(posts(calls)).toHaveLength(1);
        expect(posts(calls)[0].body).toEqual({
            studentContractId: 10,
            callTypeId: 1,
            callDate: "2026-10-01T11:20:00",
            answerTypeId: 3,
            callConversation: "will pay",
            mustPayDate: "2026-10-08",
        });
    });

    it("is not sent without a result", async () => {
        const calls = serve();
        const { onSaved } = renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));

        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

        expect(posts(calls)).toHaveLength(0);
        expect(onSaved).not.toHaveBeenCalled();
    });

    it("shows the server's refusal and stays open", async () => {
        serve({
            create: () => ({
                status: 400,
                body: { title: "AnswerTypeNotFound", detail: "result not found", status: 400 },
            }),
        });
        const { onSaved } = renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));

        fireEvent.change(field("შედეგი"), { target: { value: "2" } });
        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

        expect(await screen.findByText("result not found")).toBeInTheDocument();
        expect(onSaved).not.toHaveBeenCalled();
    });

    // the whole conversation is in the tooltip of the shortened one
    it("shows the whole conversation of a past call as its tooltip", async () => {
        const text = `${"word ".repeat(20)}end`;
        serve({ rows: () => ({ status: 200, body: { ...history, rows: [crmCallRow({ callConversation: text })] } }) });
        renderDialog();

        const table = await screen.findByTestId("crmCallsHistory");
        const cell = within(table).getByTitle(text);
        expect(cell.textContent).toHaveLength(60);
    });

    it("gives no tooltip to a past call without conversation", async () => {
        serve();
        renderDialog();

        const table = await screen.findByTestId("crmCallsHistory");
        const firstRow = within(table).getAllByRole("row")[1];
        expect(within(firstRow).getAllByRole("cell")[2]).toHaveAttribute("title", "");
    });

    // a saved call reloads the history; while it loads the old calls are not shown
    it("reloads the history after a saved call", async () => {
        let historyRequests = 0;
        serve({
            rows: () =>
                ++historyRequests === 1 ? { status: 200, body: history } : new Promise<FetchReply>(() => {}),
        });
        const { onSaved } = renderDialog();
        await screen.findByTestId("crmCallsHistory");
        fireEvent.change(field("შედეგი"), { target: { value: "3" } });

        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByTestId("crmCallsHistory")).not.toBeInTheDocument());
        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(historyRequests).toBe(2);
    });

    // an error left by the page (e.g. a failed recount) is not shown in the window
    it("clears the change errors left from before", async () => {
        serve();
        const store = createCrmCallsStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderCrmCallsOnRoute(
            <CrmCallDialog contract={contract} onClose={vi.fn()} onSaved={vi.fn()} />,
            store,
            "/deposits",
            "/deposits"
        );

        await screen.findByTestId("crmCallsHistory");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
    });

    it("clears the old error when saving again", async () => {
        let creates = 0;
        serve({
            create: () =>
                ++creates === 1
                    ? { status: 400, body: { title: "AnswerTypeNotFound", detail: "refused", status: 400 } }
                    : new Promise<FetchReply>(() => {}),
        });
        renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));
        fireEvent.change(field("შედეგი"), { target: { value: "2" } });
        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));
        await screen.findByText("refused");

        fireEvent.click(screen.getByRole("button", { name: /შენახვა/ }));

        await waitFor(() => expect(screen.getByRole("button", { name: /შენახვა/ })).toBeDisabled());
        expect(screen.queryByText("refused")).not.toBeInTheDocument();
    });

    it("shows the spinner on the save button while saving", async () => {
        serve({ create: () => new Promise<FetchReply>(() => {}) });
        renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));
        const save = () => screen.getByRole("button", { name: /შენახვა/ });
        expect(save()).not.toBeDisabled();
        expect(save().querySelector(".spinner-border")).toBeNull();
        fireEvent.change(field("შედეგი"), { target: { value: "2" } });

        fireEvent.click(save());

        await waitFor(() => expect(save()).toBeDisabled());
        expect(save().querySelector(".spinner-border")).not.toBeNull();
    });

    // the window sends the call itself; the browser must not submit the form
    it("keeps the browser from submitting the form", async () => {
        serve();
        renderDialog();
        await waitFor(() => expect(field("ზარის ტიპი")).toHaveValue("1"));
        const form = screen.getByRole("button", { name: /შენახვა/ }).closest("form")!;

        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    it("closes without saving", async () => {
        const calls = serve();
        const { onClose, onSaved } = renderDialog();
        await screen.findByTestId("crmCallsHistory");

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSaved).not.toHaveBeenCalled();
        expect(posts(calls)).toHaveLength(0);
    });
});
