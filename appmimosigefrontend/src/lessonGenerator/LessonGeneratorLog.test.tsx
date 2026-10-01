//LessonGeneratorLog.test.tsx

import { act, screen, waitFor, within } from "@testing-library/react";
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

function renderLog(url = "/log", menu: MenuState = "withRight", store = createGroupsStore(menu)) {
    return renderGroupsOnRoute(<LessonGeneratorLog />, store, "/log", url);
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

    it("leaves the date and the lesson empty for an error of the whole group", async () => {
        mockFetch(() => ({ status: 200, body: rows }));

        renderLog();

        const row = (await screen.findByText(/1. ჯგუფში მასწავლებელი/)).closest("tr") as HTMLTableRowElement;
        expect(row.cells[1].textContent).toBe("");
        expect(row.cells[2].textContent).toBe("");
    });

    it.each([
        ["/log", "ლოგში ყოველი ჯგუფის მხოლოდ ბოლო გენერაციის შეცდომებია. ჯგუფები"],
        [
            "/log?grpId=7",
            "ლოგში ყოველი ჯგუფის მხოლოდ ბოლო გენერაციის შეცდომებია. ნაჩვენებია ერთი ჯგუფი: ჯგუფის გვერდი, ყველა ჯგუფის ლოგი",
        ],
    ])("explains the log on %s", async (url, expected) => {
        mockFetch(() => ({ status: 200, body: rows }));

        renderLog(url);

        expect((await screen.findByText(/ლოგში ყოველი ჯგუფის/)).textContent).toBe(expected);
    });

    it("loads the log again when the page is opened again", async () => {
        const calls = mockFetch(() => ({ status: 200, body: rows }));
        const store = createGroupsStore();
        const firstVisit = renderLog("/log", "withRight", store);
        await screen.findByText(/14. აღმოჩენილია/);
        firstVisit.unmount();

        renderLog("/log", "withRight", store);

        await waitFor(() => expect(calls).toHaveLength(2));
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
