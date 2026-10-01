//GroupsLessonsGenerator.test.tsx

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl, type FetchReply } from "../testUtils/testStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import { changedGroup, generation, groupGeneration } from "../testUtils/lessonGeneratorTestData";
import GroupsLessonsGenerator from "./GroupsLessonsGenerator";

function renderGenerator(appClaims?: string[]) {
    return renderGroupsOnRoute(<GroupsLessonsGenerator />, createGroupsStore("withRight", appClaims), "/list", "/list");
}

const dirtyButton = () => screen.getByRole("button", { name: /ყველა ჯგუფის გაკვეთილები/ });
const recountButton = () => screen.queryByRole("button", { name: /გადაანგარიშება/ });

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
