//GroupsLessonsGenerator.test.tsx

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, testBaseUrl, type FetchReply } from "../testUtils/testStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import { changedGroup, generation, groupGeneration } from "../testUtils/lessonGeneratorTestData";
import GroupsLessonsGenerator from "./GroupsLessonsGenerator";

function renderGenerator(appClaims?: string[], store = createGroupsStore("withRight", appClaims)) {
    return renderGroupsOnRoute(<GroupsLessonsGenerator />, store, "/list", "/list");
}

const dirtyButton = () => screen.getByRole("button", { name: /ყველა ჯგუფის გაკვეთილები/ });
const recountButton = () => screen.queryByRole("button", { name: /გადაანგარიშება/ });
const spinnerIn = (button: HTMLElement | null) => (button as HTMLElement).querySelector(".spinner-border");

// the first request gets the reply, the later ones never finish
function replyOnce(reply: FetchReply) {
    let attempt = 0;
    return mockFetch(() => (attempt++ === 0 ? reply : new Promise<FetchReply>(() => {})));
}

describe("GroupsLessonsGenerator", () => {
    it("generates the dirty groups and shows the changed ones", async () => {
        const calls = mockFetch(() => ({
            status: 200,
            body: generation([groupGeneration({ grpId: 5, groupCode: "0901" }), changedGroup]),
        }));
        renderGenerator();

        fireEvent.click(dirtyButton());

        expect(await screen.findByText(/დამუშავდა 2 ჯგუფი, ცვლილება ან შეცდომა აქვს 1-ს/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "ჯგუფი 1001" })).toBeInTheDocument();
        expect(calls[0].method).toBe("POST");
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/dirtygroups`);
    });

    it("offers the recount of all groups only with the special right", () => {
        renderGenerator();

        expect(recountButton()).not.toBeInTheDocument();
    });

    it("recounts all groups with the special right", async () => {
        const calls = mockFetch(() => ({ status: 200, body: generation([changedGroup]) }));
        renderGenerator(["RecountAllGroupsLessons"]);

        fireEvent.click(recountButton() as HTMLElement);

        expect(await screen.findByText(/გაკვეთილები დათვლილია/)).toBeInTheDocument();
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/allgroups`);
    });

    it("disables both buttons while a generation runs", async () => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        renderGenerator(["RecountAllGroupsLessons"]);

        fireEvent.click(dirtyButton());

        await waitFor(() => expect(dirtyButton()).toBeDisabled());
        expect(recountButton()).toBeDisabled();
    });

    it("shows the server error, for example a missing right", async () => {
        mockFetch(() => ({
            status: 403,
            body: [{ code: "InsufficientRights", name: "არასაკმარისი უფლებები" }],
        }));
        renderGenerator(["RecountAllGroupsLessons"]);

        fireEvent.click(recountButton() as HTMLElement);

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it.each([
        ["dirty groups", dirtyButton, recountButton],
        ["recount", recountButton, dirtyButton],
    ])("shows the spinner only in the %s button while it runs", async (_, running, other) => {
        mockFetch(() => new Promise<FetchReply>(() => {}));
        renderGenerator(["RecountAllGroupsLessons"]);
        expect(spinnerIn(running())).toBeNull();

        fireEvent.click(running() as HTMLElement);

        await waitFor(() => expect(spinnerIn(running())).not.toBeNull());
        expect(spinnerIn(other())).toBeNull();
    });

    it("does not show an error left from before", () => {
        const store = createGroupsStore("withRight");
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "ძველი შეცდომა" }]));

        renderGenerator(undefined, store);

        expect(screen.queryByText("ძველი შეცდომა")).not.toBeInTheDocument();
    });

    it("clears the previous error when the next generation starts", async () => {
        replyOnce({ status: 403, body: [{ code: "InsufficientRights", name: "არასაკმარისი უფლებები" }] });
        renderGenerator();
        fireEvent.click(dirtyButton());
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

        fireEvent.click(dirtyButton());

        await waitFor(() => expect(dirtyButton()).toBeDisabled());
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("forgets the previous result when the next generation starts", async () => {
        replyOnce({ status: 200, body: generation([changedGroup]) });
        renderGenerator();
        fireEvent.click(dirtyButton());
        await screen.findByText(/გაკვეთილები დათვლილია/);

        fireEvent.click(dirtyButton());

        await waitFor(() => expect(dirtyButton()).toBeDisabled());
        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it("closes the result", async () => {
        mockFetch(() => ({ status: 200, body: generation([changedGroup]) }));
        renderGenerator();
        fireEvent.click(dirtyButton());
        await screen.findByText(/გაკვეთილები დათვლილია/);

        fireEvent.click(screen.getByRole("button", { name: /close/i }));

        expect(screen.queryByText(/გაკვეთილები დათვლილია/)).not.toBeInTheDocument();
    });

    it("links to the log of all groups", () => {
        renderGenerator();

        expect(screen.getByRole("link", { name: "გენერატორის ლოგი" })).toHaveAttribute("href", "/lessonGeneratorLog");
    });
});
