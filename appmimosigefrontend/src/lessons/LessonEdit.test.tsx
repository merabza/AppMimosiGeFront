//LessonEdit.test.tsx

import { act, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, testBaseUrl, type FetchCall, type FetchReply } from "../testUtils/testStore";
import {
    createLessonsStore,
    lessonData,
    lessonLookups,
    renderLessonsOnRoute,
    type LessonsStore,
} from "../testUtils/lessonsTestStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import type { ILesson } from "../redux/types/lessonsTypes";
import LessonEdit from "./LessonEdit";

const base = `${testBaseUrl}/lessons`;

// the lookups and lessons by id; PUT answers with the given reply
function serve(
    lessons: Record<number, ILesson> = { 9: lessonData() },
    put: (call: FetchCall) => FetchReply = () => ({ status: 200 })
): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.endsWith("/formlookups")) return { status: 200, body: lessonLookups };
        if (call.method === "PUT") return put(call);
        const lesson = lessons[Number(call.url.split("/").pop())];
        return lesson
            ? { status: 200, body: lesson }
            : { status: 404, body: { title: "LessonNotFound", detail: "not found", status: 404 } };
    });
}

function renderEditor(menu: MenuState = "withRight", ...urls: string[]) {
    return renderLessonsOnRoute(
        <LessonEdit />,
        createLessonsStore(menu),
        "/lessonEdit/:lessonId",
        ...(urls.length === 0 ? ["/lessonEdit/9"] : urls)
    );
}

const presentBox = (name: string) =>
    screen.getByRole("checkbox", { name: `${name}: დაესწრო` });
const cell = (name: string, caption: string) =>
    screen.getByRole("textbox", { name: `${name}: ${caption}` });
const numberCell = (name: string, caption: string) =>
    screen.getByRole("spinbutton", { name: `${name}: ${caption}` });
const saveButton = () => screen.getByRole("button", { name: /შენახვა/ });
const puts = (calls: FetchCall[]) => calls.filter((c) => c.method === "PUT");

async function renderLoaded(menu: MenuState = "withRight", ...urls: string[]) {
    const view = renderEditor(menu, ...urls);
    await screen.findByText("Gamma Gia");
    return view;
}

describe("LessonEdit", () => {
    it("shows the generator fields read-only and the journal fields editable", async () => {
        serve({ 9: lessonData({ lessonStatusId: 3, substituteTeacherContractId: 5, note: "late" }) });
        await renderLoaded();

        expect(screen.getByLabelText("ჯგუფი")).toHaveValue("1001 Math");
        expect(screen.getByLabelText("ჯგუფი")).toBeDisabled();
        expect(screen.getByLabelText("მასწავლებელი")).toHaveValue("Alpha Ann / T3.01");
        expect(screen.getByLabelText("მასწავლებელი")).toBeDisabled();
        expect(screen.getByLabelText("თარიღი და დრო")).toHaveValue("30.09.2026 15:00");
        expect(screen.getByLabelText("თარიღი და დრო")).toBeDisabled();
        expect(screen.getByLabelText("ხელფასის სქემა")).toBeDisabled();
        expect(screen.getByLabelText("4 კვ. საათები")).toHaveValue("8");
        expect(screen.getByLabelText("თეორიული თარიღები")).toHaveValue("28.09.2026 – 02.10.2026");
        expect(screen.getByLabelText("სტატუსი")).toHaveValue("3");
        expect(screen.getByLabelText("სტატუსი")).toBeEnabled();
        expect(screen.getByLabelText("შემცვლელი")).toHaveValue("5");
        expect(screen.getByLabelText("შენიშვნა")).toHaveValue("late");
        expect(screen.getByText(/ID 9/)).toBeInTheDocument();
    });

    it("lists the students with their hours read-only and their journal fields", async () => {
        serve();
        await renderLoaded();

        const rows = screen.getAllByRole("row").slice(1);
        expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual([
            "Gamma Gia",
            "Delta Dan",
            "Epsilon Eva",
        ]);
        expect(within(rows[0]).getAllByRole("cell")[1].textContent).toBe("1.5");
        expect(presentBox("Gamma Gia")).toBeChecked();
        expect(presentBox("Delta Dan")).not.toBeChecked();
        expect(cell("Gamma Gia", "თემა")).toHaveValue("Fractions");
        expect(numberCell("Gamma Gia", "შეფასება")).toHaveValue(9);
        expect(cell("Gamma Gia", "მასწავლებლის კომენტარი")).toHaveValue("good");
        expect(numberCell("Gamma Gia", "დაგვიანება წთ.")).toHaveValue(5);
        expect(screen.getByText(/დასწრება და კომენტარები \(3\)/)).toBeInTheDocument();
    });

    it("marks every student present with one button", async () => {
        serve();
        await renderLoaded();

        fireEvent.click(screen.getByRole("button", { name: /ყველა დაესწრო/ }));

        for (const name of ["Gamma Gia", "Delta Dan", "Epsilon Eva"]) expect(presentBox(name)).toBeChecked();
    });

    it("disables 'all present' for a lesson without students", async () => {
        serve({ 9: lessonData({ students: [] }) });
        renderEditor();

        expect(await screen.findByRole("button", { name: /ყველა დაესწრო/ })).toBeDisabled();
    });

    it.each([
        ["ArrowDown", false, "Delta Dan"],
        ["Enter", false, "Delta Dan"],
    ])("%s moves to the same column of the next student", async (key, shiftKey, next) => {
        serve();
        await renderLoaded();
        const theme = cell("Gamma Gia", "თემა");
        theme.focus();

        const notCancelled = fireEvent.keyDown(theme, { key, shiftKey });

        expect(notCancelled).toBe(false);
        expect(cell(next, "თემა")).toHaveFocus();
    });

    it("ArrowUp and Shift+Enter move to the previous student, the checkbox column too", async () => {
        serve();
        await renderLoaded();
        presentBox("Epsilon Eva").focus();

        fireEvent.keyDown(presentBox("Epsilon Eva"), { key: "ArrowUp" });
        expect(presentBox("Delta Dan")).toHaveFocus();
        fireEvent.keyDown(presentBox("Delta Dan"), { key: "Enter", shiftKey: true });
        expect(presentBox("Gamma Gia")).toHaveFocus();
    });

    // Enter in the grid never saves the form, even on the last row
    it("Enter on the last row stays there and does not save", async () => {
        const calls = serve();
        await renderLoaded();
        const last = numberCell("Epsilon Eva", "შეფასება");
        last.focus();

        const notCancelled = fireEvent.keyDown(last, { key: "Enter" });

        expect(notCancelled).toBe(false);
        expect(last).toHaveFocus();
        expect(puts(calls)).toHaveLength(0);
    });

    it("leaves the other keys to the browser", async () => {
        serve();
        await renderLoaded();
        const theme = cell("Gamma Gia", "თემა");
        theme.focus();

        expect(fireEvent.keyDown(theme, { key: "ArrowRight" })).toBe(true);
        expect(theme).toHaveFocus();
    });

    it("clears the entered data of a student", async () => {
        serve();
        await renderLoaded();
        const row = screen.getAllByRole("row")[1];

        fireEvent.click(within(row).getByRole("button", { name: "გასუფთავება" }));

        expect(presentBox("Gamma Gia")).not.toBeChecked();
        expect(cell("Gamma Gia", "თემა")).toHaveValue("");
        expect(numberCell("Gamma Gia", "შეფასება")).toHaveValue(null);
        expect(cell("Gamma Gia", "მასწავლებლის კომენტარი")).toHaveValue("");
        expect(numberCell("Gamma Gia", "დაგვიანება წთ.")).toHaveValue(0);
        expect(within(row).getByRole("button", { name: "გასუფთავება" })).toBeDisabled();
        expect(
            within(screen.getAllByRole("row")[2]).getByRole("button", { name: "გასუფთავება" })
        ).toBeDisabled();
    });

    it("saves the journal and shows the saved values", async () => {
        const saved = lessonData({
            lessonStatusId: 2,
            substituteTeacherContractId: 5,
            teacherLateMinutes: 10,
            recoverDate: "2026-10-05T00:00:00",
            note: "trimmed",
        });
        //after the PUT the lesson comes back as the server saved it
        const lessons: Record<number, ILesson> = { 9: lessonData() };
        const calls = serve(lessons, () => {
            lessons[9] = saved;
            return { status: 200 };
        });
        await renderLoaded();

        fireEvent.change(screen.getByLabelText("სტატუსი"), { target: { value: "2" } });
        fireEvent.change(screen.getByLabelText("შემცვლელი"), { target: { value: "5" } });
        fireEvent.change(screen.getByLabelText("მასწ. დაგვიანება წთ."), { target: { value: "10" } });
        fireEvent.change(screen.getByLabelText("აღდგენის თარიღი"), { target: { value: "2026-10-05" } });
        fireEvent.change(screen.getByLabelText("შენიშვნა"), { target: { value: " trimmed " } });
        fireEvent.click(presentBox("Delta Dan"));
        fireEvent.change(cell("Delta Dan", "თემა"), { target: { value: "Fractions" } });
        fireEvent.change(numberCell("Delta Dan", "შეფასება"), { target: { value: "7.5" } });
        fireEvent.click(saveButton());

        expect(await screen.findByText("შენახულია")).toBeInTheDocument();
        const put = puts(calls)[0];
        expect(put.url).toBe(`${base}/9`);
        expect(put.body).toEqual({
            lessonStatusId: 2,
            substituteTeacherContractId: 5,
            teacherLateMinutes: 10,
            recoverDate: "2026-10-05",
            note: "trimmed",
            students: [
                {
                    id: 21,
                    present: true,
                    theme: "Fractions",
                    rate: 9,
                    teacherComment: "good",
                    studentComment: null,
                    studentLateMinutes: 5,
                },
                {
                    id: 22,
                    present: true,
                    theme: "Fractions",
                    rate: 7.5,
                    teacherComment: null,
                    studentComment: null,
                    studentLateMinutes: 0,
                },
                {
                    id: 23,
                    present: false,
                    theme: null,
                    rate: null,
                    teacherComment: null,
                    studentComment: null,
                    studentLateMinutes: 0,
                },
            ],
        });
        //the form shows the lesson as it was loaded again after the save
        await waitFor(() => expect(screen.getByLabelText("შენიშვნა")).toHaveValue("trimmed"));
        expect(presentBox("Delta Dan")).not.toBeChecked();
        expect(screen.getByLabelText("სტატუსი")).toHaveValue("2");
    });

    it("hides 'saved' again on the next change", async () => {
        serve();
        await renderLoaded();
        fireEvent.click(saveButton());
        expect(await screen.findByText("შენახულია")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("შენიშვნა"), { target: { value: "x" } });

        expect(screen.queryByText("შენახულია")).not.toBeInTheDocument();
    });

    it("shows the server error and stays on the lesson", async () => {
        serve(undefined, () => ({
            status: 400,
            body: { title: "LessonStatusNotFound", detail: "გაკვეთილის სტატუსი ვერ მოიძებნა", status: 400 },
        }));
        await renderLoaded();

        fireEvent.click(saveButton());

        expect(await screen.findByText(/გაკვეთილის სტატუსი ვერ მოიძებნა/)).toBeInTheDocument();
        expect(screen.queryByText("შენახულია")).not.toBeInTheDocument();
        expect(screen.getByTestId("location").textContent).toBe("/lessonEdit/9");
    });

    it("opens the previous and the next lesson of the group", async () => {
        serve({
            8: lessonData({ lessonId: 8, nextLessonId: 9, previousLessonId: null, lessonDt: "2026-09-28T15:00:00" }),
            9: lessonData(),
        });
        await renderLoaded();

        fireEvent.click(screen.getByRole("button", { name: /წინა გაკვეთილი/ }));

        await waitFor(() => expect(screen.getByLabelText("თარიღი და დრო")).toHaveValue("28.09.2026 15:00"));
        expect(screen.getByTestId("location").textContent).toBe("/lessonEdit/8");
        expect(screen.getByRole("button", { name: /წინა გაკვეთილი/ })).toBeDisabled();
        expect(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ })).toBeEnabled();
    });

    it("blocks moving to another lesson while there are unsaved changes", async () => {
        serve();
        await renderLoaded();

        fireEvent.click(presentBox("Delta Dan"));

        expect(screen.getByRole("button", { name: /წინა გაკვეთილი/ })).toBeDisabled();
        expect(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ })).toBeDisabled();
        expect(screen.getByText("ჯერ შეინახეთ ცვლილებები")).toBeInTheDocument();
    });

    it("links to the group", async () => {
        serve();
        await renderLoaded();

        fireEvent.click(screen.getByRole("link", { name: "1001" }));

        expect(screen.getByText("group page")).toBeInTheDocument();
    });

    it("closes back to the list it was opened from", async () => {
        serve();
        await renderLoaded("withRight", "/lessons?grpId=7", "/lessonEdit/9");

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(screen.getByTestId("location").textContent).toBe("/lessons?grpId=7");
    });

    it("closes to the list when opened directly", async () => {
        serve();
        await renderLoaded();

        fireEvent.click(screen.getByRole("button", { name: /დახურვა/ }));

        expect(screen.getByTestId("location").textContent).toBe("/lessons");
    });

    it("says so without the lessons right and loads nothing", () => {
        const calls = serve();
        renderEditor("withoutRight");

        expect(screen.getByText("გაკვეთილების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("shows the load error of a missing lesson", async () => {
        serve({});
        renderEditor();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});

describe("LessonEdit details", () => {
    const loadingText = "მიმდინარეობს ჩატვირთვა...";
    const clearButton = (row: number) =>
        within(screen.getAllByRole("row")[row]).getByRole("button", { name: "გასუფთავება" });

    function renderEditorWith(store: LessonsStore, ...urls: string[]) {
        return renderLessonsOnRoute(
            <LessonEdit />,
            store,
            "/lessonEdit/:lessonId",
            ...(urls.length === 0 ? ["/lessonEdit/9"] : urls)
        );
    }

    it("shows the group, time and id in the heading", async () => {
        serve();
        await renderLoaded();

        expect(screen.getByRole("heading", { level: 5 }).textContent).toBe(
            "გაკვეთილი: ჯგუფი 1001, 30.09.2026 15:00 (ID 9)"
        );
    });

    it("captions the grid columns", async () => {
        serve();
        await renderLoaded();

        expect(
            within(screen.getByRole("table"))
                .getAllByRole("columnheader")
                .map((h) => h.textContent)
        ).toEqual([
            "მოსწავლე",
            "საათები",
            "დაესწრო",
            "თემა",
            "შეფასება",
            "მასწავლებლის კომენტარი",
            "მოსწავლის კომენტარი",
            "დაგვიანება წთ.",
            "",
        ]);
        expect(screen.getByText(/↑ ↓ და Enter/)).toBeInTheDocument();
    });

    // a rate may have any decimals, lateness is whole minutes from 0, the texts fit their columns
    it("limits the grid inputs as the columns do", async () => {
        serve();
        await renderLoaded();

        expect(numberCell("Gamma Gia", "შეფასება")).toHaveAttribute("step", "any");
        expect(numberCell("Gamma Gia", "დაგვიანება წთ.")).toHaveAttribute("min", "0");
        expect(numberCell("Gamma Gia", "დაგვიანება წთ.")).toHaveAttribute("step", "1");
        for (const caption of ["თემა", "მასწავლებლის კომენტარი", "მოსწავლის კომენტარი"])
            expect(cell("Gamma Gia", caption)).toHaveAttribute("maxLength", "255");
        expect(screen.getByLabelText("შენიშვნა")).toHaveAttribute("maxLength", "255");
        expect(screen.getByLabelText("მასწ. დაგვიანება წთ.")).toHaveAttribute("min", "0");
    });

    it("lists 'none' first among the substitutes", async () => {
        serve();
        await renderLoaded();

        expect(
            within(screen.getByLabelText("შემცვლელი"))
                .getAllByRole("option")
                .map((o) => o.textContent)
        ).toEqual(["-- არ არის --", "Alpha Ann / T3.01", "Beta Bob / T3.02"]);
    });

    it("sends the student comment typed in its column", async () => {
        const calls = serve();
        await renderLoaded();

        fireEvent.change(cell("Delta Dan", "მოსწავლის კომენტარი"), { target: { value: "late bus" } });
        fireEvent.click(saveButton());

        await screen.findByText("შენახულია");
        const body = puts(calls)[0].body as { students: { id: number; studentComment: string | null }[] };
        expect(body.students.map((s) => s.studentComment)).toEqual([null, "late bus", null]);
    });

    // the clear button is outside the keyboard path and says what it clears
    it("keeps the clear button out of the tab order", async () => {
        serve();
        await renderLoaded();

        expect(clearButton(1)).toHaveAttribute("tabindex", "-1");
        expect(clearButton(1)).toHaveAttribute(
            "title",
            "დასწრების, თემის, შეფასების და კომენტარების გასუფთავება"
        );
    });

    // lateness alone or entered data alone is something to clear; an empty row is not
    it("enables clearing for any row with something to clear", async () => {
        const [gamma, delta, epsilon] = lessonData().students;
        serve({
            9: lessonData({
                students: [
                    { ...gamma, theme: null, rate: null, teacherComment: null, studentLateMinutes: 0 },
                    { ...delta, studentLateMinutes: 7 },
                    epsilon,
                ],
            }),
        });
        await renderLoaded();

        expect(clearButton(1)).toBeEnabled();
        expect(clearButton(2)).toBeEnabled();
        expect(clearButton(3)).toBeDisabled();
    });

    it("clears only the chosen student", async () => {
        serve();
        await renderLoaded();
        fireEvent.click(presentBox("Delta Dan"));

        fireEvent.click(clearButton(1));

        expect(presentBox("Gamma Gia")).not.toBeChecked();
        expect(presentBox("Delta Dan")).toBeChecked();
    });

    it("leaves Enter on a grid button to the browser", async () => {
        serve();
        await renderLoaded();

        expect(fireEvent.keyDown(clearButton(1), { key: "Enter" })).toBe(true);
    });

    it("keeps the browser on the page when the form is submitted", async () => {
        serve();
        const { container } = await renderLoaded();
        const form = container.querySelector("form")!;
        const submit = createEvent.submit(form);

        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
        await screen.findByText("შენახულია");
    });

    it("shows a spinner on the save button while saving", async () => {
        serve(undefined, () => new Promise<FetchReply>(() => {}) as unknown as FetchReply);
        await renderLoaded();
        expect(saveButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.click(saveButton());

        await waitFor(() => expect(saveButton()).toBeDisabled());
        expect(saveButton().querySelector(".spinner-border")).not.toBeNull();
    });

    it("clears the error of a failed save when saving again", async () => {
        let attempt = 0;
        serve(undefined, () =>
            attempt++ === 0
                ? {
                      status: 400,
                      body: { title: "LessonStatusNotFound", detail: "status error", status: 400 },
                  }
                : { status: 200 }
        );
        await renderLoaded();
        fireEvent.click(saveButton());
        expect(await screen.findByText(/status error/)).toBeInTheDocument();

        fireEvent.click(saveButton());

        expect(await screen.findByText("შენახულია")).toBeInTheDocument();
        expect(screen.queryByText(/status error/)).not.toBeInTheDocument();
    });

    // an edit hides "saved" even when it is undone again
    it.each([
        [
            "a lesson field",
            () => {
                fireEvent.change(screen.getByLabelText("შენიშვნა"), { target: { value: "x" } });
                fireEvent.change(screen.getByLabelText("შენიშვნა"), { target: { value: "" } });
            },
        ],
        [
            "a student field",
            () => {
                fireEvent.click(presentBox("Delta Dan"));
                fireEvent.click(presentBox("Delta Dan"));
            },
        ],
    ])("hides 'saved' after %s is changed and changed back", async (_, editAndUndo) => {
        serve();
        await renderLoaded();
        fireEvent.click(saveButton());
        await screen.findByText("შენახულია");

        editAndUndo();

        expect(screen.getByRole("button", { name: /წინა გაკვეთილი/ })).toBeEnabled();
        expect(screen.queryByText("შენახულია")).not.toBeInTheDocument();
    });

    it("does not carry 'saved' to the next lesson", async () => {
        serve({ 9: lessonData(), 10: lessonData({ lessonId: 10, previousLessonId: 9, nextLessonId: null }) });
        await renderLoaded();
        fireEvent.click(saveButton());
        await screen.findByText("შენახულია");

        fireEvent.click(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ }));

        await waitFor(() => expect(screen.getByRole("heading", { level: 5 }).textContent).toContain("(ID 10)"));
        expect(screen.queryByText("შენახულია")).not.toBeInTheDocument();
    });

    it("does not carry a save error to the next lesson", async () => {
        serve(
            { 9: lessonData(), 10: lessonData({ lessonId: 10, previousLessonId: 9, nextLessonId: null }) },
            () => ({
                status: 400,
                body: { title: "LessonStatusNotFound", detail: "status error", status: 400 },
            })
        );
        await renderLoaded();
        fireEvent.click(saveButton());
        await screen.findByText(/status error/);

        fireEvent.click(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ }));

        await waitFor(() => expect(screen.getByRole("heading", { level: 5 }).textContent).toContain("(ID 10)"));
        expect(screen.queryByText(/status error/)).not.toBeInTheDocument();
    });

    // the old lesson is not shown under the new address while the new one loads
    it("shows the loading page while the next lesson loads", async () => {
        let answerLesson10: (reply: FetchReply) => void = () => {};
        mockFetch((call) => {
            if (call.url.endsWith("/formlookups")) return { status: 200, body: lessonLookups };
            if (call.url.endsWith("/lessons/10"))
                return new Promise<FetchReply>((resolve) => {
                    answerLesson10 = resolve;
                });
            return { status: 200, body: lessonData() };
        });
        await renderLoaded();

        fireEvent.click(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ }));

        expect(await screen.findByText(loadingText)).toBeInTheDocument();
        expect(screen.queryByText("Gamma Gia")).not.toBeInTheDocument();
        answerLesson10({ status: 200, body: lessonData({ lessonId: 10, previousLessonId: 9 }) });
        await waitFor(() => expect(screen.getByRole("heading", { level: 5 }).textContent).toContain("(ID 10)"));
    });

    // a failed load keeps the previous lesson's data in the query; it never fills the form of the new address
    it("never fills a lesson's form with the previous lesson after a failed load", async () => {
        serve({ 9: lessonData() });
        const store = createLessonsStore();
        renderEditorWith(store);
        await screen.findByText("Gamma Gia");

        fireEvent.click(screen.getByRole("button", { name: /შემდეგი გაკვეთილი/ }));
        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
        act(() => {
            store.dispatch(clearAlert(EAlertKind.ApiLoad));
        });

        expect(screen.getByText(loadingText)).toBeInTheDocument();
        expect(screen.queryByText("Gamma Gia")).not.toBeInTheDocument();
    });

    it("starts no query without the lessons right", () => {
        serve();
        const store = createLessonsStore("withoutRight");
        renderEditorWith(store);

        expect(Object.keys(store.getState().lessonsApi.queries)).toEqual([]);
    });
});
