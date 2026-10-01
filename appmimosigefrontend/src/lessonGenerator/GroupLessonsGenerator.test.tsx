//GroupLessonsGenerator.test.tsx

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, testBaseUrl, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import { changedGroup, generation, groupGeneration } from "../testUtils/lessonGeneratorTestData";
import GroupLessonsGenerator from "./GroupLessonsGenerator";

const generated = generation([changedGroup]);

function renderGenerator(hasUnsavedChanges = false) {
    return renderGroupsOnRoute(
        <>
            <GroupLessonsGenerator grpId={7} hasUnsavedChanges={hasUnsavedChanges} />
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
        </>,
        createGroupsStore(),
        "/editor",
        "/editor"
    );
}

const lessonsButton = () => screen.getByRole("button", { name: /ამ ჯგუფის გაკვეთილები/ });
const lastLessonButton = () => screen.getByRole("button", { name: /ამ ჯგუფის ბოლო გაკვეთილი/ });
const spinnerIn = (button: HTMLElement) => button.querySelector(".spinner-border");
const buttons = [
    ["lessons", lessonsButton],
    ["last lesson", lastLessonButton],
] as const;

// the first request gets the reply, the later ones never finish
function replyOnce(reply: (call: FetchCall) => FetchReply) {
    let attempt = 0;
    return mockFetch((call) => (attempt++ === 0 ? reply(call) : new Promise<FetchReply>(() => {})));
}

describe("GroupLessonsGenerator", () => {
    it("generates the lessons of the group and shows the result", async () => {
        const calls = mockFetch(() => ({ status: 200, body: generated }));
        renderGenerator();

        fireEvent.click(lessonsButton());

        expect(await screen.findByText(/შეიქმნა 1, შეიცვალა 1, წაიშალა 0 გაკვეთილი/)).toBeInTheDocument();
        expect(calls).toHaveLength(1);
        expect(calls[0].method).toBe("POST");
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/groups/7`);
        expect(screen.queryByText(/ბოლო გაკვეთილი:/)).not.toBeInTheDocument();
    });

    it("shows the last lesson with its id and the changes on the way", async () => {
        const calls = mockFetch(() => ({
            status: 200,
            body: { lessonId: 4165, lessonDt: "2026-09-28T15:00:00", generation: generation([changedGroup]) },
        }));
        renderGenerator();

        fireEvent.click(lastLessonButton());

        expect(await screen.findByText("ბოლო გაკვეთილი: 28.09.2026 15:00 (ID 4165)")).toBeInTheDocument();
        expect(screen.getByText(/შეიქმნა 1, შეიცვალა 1/)).toBeInTheDocument();
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/groups/7/lastlesson`);
    });

    it("says so when the group had no lesson day yet", async () => {
        mockFetch(() => ({
            status: 200,
            body: { lessonId: null, lessonDt: null, generation: generation([groupGeneration()]) },
        }));
        renderGenerator();

        fireEvent.click(lastLessonButton());

        expect(await screen.findByText("ჯგუფს დღემდე გაკვეთილის დღე არ ჰქონია")).toBeInTheDocument();
    });

    it("disables both buttons while a generation runs", async () => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        renderGenerator();

        fireEvent.click(lessonsButton());

        await waitFor(() => expect(lessonsButton()).toBeDisabled());
        expect(lastLessonButton()).toBeDisabled();
    });

    it("disables both buttons while the form has unsaved changes", () => {
        renderGenerator(true);

        expect(lessonsButton()).toBeDisabled();
        expect(lastLessonButton()).toBeDisabled();
        expect(screen.getByText(/ჯერ შეინახეთ ცვლილებები/)).toBeInTheDocument();
    });

    it("shows the server error instead of a result", async () => {
        mockFetch(() => ({ status: 404, body: { title: "GroupNotFound", detail: "ჯგუფი ვერ მოიძებნა", status: 404 } }));
        renderGenerator();

        fireEvent.click(lessonsButton());

        expect(await screen.findByText(/ჯგუფი ვერ მოიძებნა/)).toBeInTheDocument();
        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it.each([
        ["lessons", lessonsButton, lastLessonButton],
        ["last lesson", lastLessonButton, lessonsButton],
    ])("shows the spinner only in the %s button while it runs", async (_, running, other) => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        renderGenerator();
        expect(spinnerIn(running())).toBeNull();

        fireEvent.click(running());

        await waitFor(() => expect(spinnerIn(running())).not.toBeNull());
        expect(spinnerIn(other())).toBeNull();
    });

    it.each(buttons)("clears the previous error when the next %s generation starts", async (_, button) => {
        replyOnce(() => ({ status: 404, body: { title: "GroupNotFound", detail: "ჯგუფი ვერ მოიძებნა", status: 404 } }));
        renderGenerator();
        fireEvent.click(button());
        await screen.findByText(/ჯგუფი ვერ მოიძებნა/);

        fireEvent.click(button());

        await waitFor(() => expect(button()).toBeDisabled());
        expect(screen.queryByText(/ჯგუფი ვერ მოიძებნა/)).not.toBeInTheDocument();
    });

    it.each(buttons)("forgets the previous result when the next %s generation starts", async (_, button) => {
        replyOnce((call) => ({
            status: 200,
            body: call.url.endsWith("/lastlesson")
                ? { lessonId: 4165, lessonDt: "2026-09-28T15:00:00", generation: generated }
                : generated,
        }));
        renderGenerator();
        fireEvent.click(button());
        await screen.findByText(/გაკვეთილები დათვლილია/);

        fireEvent.click(button());

        await waitFor(() => expect(button()).toBeDisabled());
        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it("closes the result", async () => {
        mockFetch(() => ({ status: 200, body: generated }));
        renderGenerator();
        fireEvent.click(lessonsButton());
        await screen.findByText(/გაკვეთილები დათვლილია/);

        fireEvent.click(screen.getByRole("button", { name: /close/i }));

        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it("links to the log of the group", () => {
        renderGenerator();

        expect(screen.getByRole("link", { name: "გენერატორის ლოგი" })).toHaveAttribute(
            "href",
            "/lessonGeneratorLog?grpId=7"
        );
    });
});
