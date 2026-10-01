//LessonGeneratorLog.test.tsx

import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch, testBaseUrl } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { createGroupsStore, renderGroupsOnRoute } from "../testUtils/groupsTestStore";
import type { ILessonGeneratorLogRow } from "../redux/types/lessonGeneratorTypes";
import LessonGeneratorLog from "./LessonGeneratorLog";

const rows: ILessonGeneratorLogRow[] = [
    {
        id: 3,
        createdDate: "2026-10-01T09:30:00",
        grpId: 5,
        groupCode: "0901",
        errorCode: 1,
        errorText: "ჯგუფში მასწავლებელი არ არის მითითებული",
        lessonDate: null,
        lessonId: null,
    },
    {
        id: 2,
        createdDate: "2026-10-01T09:30:00",
        grpId: 7,
        groupCode: "1001",
        errorCode: 14,
        errorText: "აღმოჩენილია ზედმეტი მოსწავლე გაკვეთილზე",
        lessonDate: "2026-10-12T15:00:00",
        lessonId: 17,
    },
];

function renderLog(url = "/log", menu: MenuState = "withRight") {
    return renderGroupsOnRoute(<LessonGeneratorLog />, createGroupsStore(menu), "/log", url);
}

async function flush() {
    for (let i = 0; i < 5; i++) await act(async () => {});
}

describe("LessonGeneratorLog", () => {
    it("tells a user without the groups right that the page is not available", async () => {
        const calls = mockFetch(() => ({ status: 200, body: rows }));

        renderLog("/log", "withoutRight");
        await flush();

        expect(screen.getByText("ჯგუფების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the menu", async () => {
        const calls = mockFetch(() => ({ status: 200, body: rows }));

        renderLog("/log", "loading");
        await flush();

        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("lists the errors of all groups with links to the groups", async () => {
        const calls = mockFetch(() => ({ status: 200, body: rows }));

        renderLog();

        const row = (await screen.findByText(/14. აღმოჩენილია ზედმეტი მოსწავლე/)).closest("tr") as HTMLElement;
        expect(within(row).getByRole("link", { name: "1001" })).toHaveAttribute("href", "/groupEdit/7");
        expect(within(row).getByText("12.10.2026 15:00")).toBeInTheDocument();
        expect(within(row).getByText("17")).toBeInTheDocument();
        expect(within(row).getByText("01.10.2026 09:30")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "0901" })).toBeInTheDocument();
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/log`);
        expect(screen.getByRole("link", { name: "ჯგუფები" })).toHaveAttribute("href", "/groups");
    });

    it("shows one group from the query string with links back", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [rows[1]] }));

        renderLog("/log?grpId=7");

        expect(await screen.findByText(/14. აღმოჩენილია/)).toBeInTheDocument();
        expect(calls[0].url).toBe(`${testBaseUrl}/lessongenerator/log?grpId=7`);
        expect(screen.getByRole("link", { name: "ჯგუფის გვერდი" })).toHaveAttribute("href", "/groupEdit/7");
        expect(screen.getByRole("link", { name: "ყველა ჯგუფის ლოგი" })).toHaveAttribute(
            "href",
            "/lessonGeneratorLog"
        );
    });

    it("says so when there are no errors", async () => {
        mockFetch(() => ({ status: 200, body: [] }));

        renderLog();

        expect(await screen.findByText("შეცდომები არ არის.")).toBeInTheDocument();
    });

    it("shows the load error", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Error", detail: "server error", status: 500 } }));

        renderLog();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
