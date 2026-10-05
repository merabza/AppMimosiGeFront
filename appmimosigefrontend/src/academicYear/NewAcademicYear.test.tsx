//NewAcademicYear.test.tsx

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import type { ICloseAcademicYearGroups, INewAcademicYear } from "../redux/types/academicYearTypes";
import {
    closeGroup,
    closeResult,
    createAcademicYearStore,
    renderWithAcademicYearStore,
    wizardInfo,
    yearInfo,
} from "../testUtils/academicYearTestStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import { mockFetch, testBaseUrl, type FetchCall, type FetchReply } from "../testUtils/testStore";
import NewAcademicYear from "./NewAcademicYear";

function newYear(dryRun: boolean, alreadyExists = false): INewAcademicYear {
    return {
        dryRun,
        ayId: dryRun ? null : 12,
        academicYearName: "2027-2028",
        startDate: "2027-09-01T00:00:00",
        finishDate: "2028-09-01T00:00:00",
        contractNumberPrefix: "7",
        alreadyExists,
    };
}

type Replies = {
    create?: (dryRun: boolean) => FetchReply | Promise<FetchReply>;
    close?: (dryRun: boolean) => FetchReply | Promise<FetchReply>;
};

const pending = (): Promise<FetchReply> => new Promise<FetchReply>(() => {});

const conflict = (title: string, detail: string): FetchReply => ({
    status: 409,
    body: { title, detail, status: 409 },
});

function serve(replies: Replies = {}): FetchCall[] {
    return mockFetch((call) => {
        const dryRun = call.url.includes("dryRun=true");
        if (call.url.endsWith("/academicyear/info")) return { status: 200, body: wizardInfo };
        if (call.url.includes("/academicyear/create"))
            return replies.create?.(dryRun) ?? { status: 200, body: newYear(dryRun) };
        if (call.url.includes("/closegroups"))
            return replies.close?.(dryRun) ?? { status: 200, body: closeResult(dryRun, [closeGroup(41)]) };
        return { status: 404, body: {} };
    });
}

function renderWizard(menu: MenuState = "withRight") {
    const store = createAcademicYearStore(menu);
    renderWithAcademicYearStore(<NewAcademicYear />, store);
    return store;
}

const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const posts = (calls: FetchCall[]) => calls.filter((c) => c.method === "POST").map((c) => c.url);

async function confirm() {
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "დიახ" }));
}

describe("NewAcademicYear", () => {
    it("says so without the right and loads nothing", async () => {
        const calls = serve();
        const store = renderWizard("withoutRight");

        expect(await screen.findByText("ახალი სასწავლო წლის დამატების უფლება არ გაქვთ")).toBeInTheDocument();
        //a started query would be in the store at once, the fetch only after a few microtasks
        expect(store.getState().academicYearApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    // before the menu is asked for, the right is unknown as well
    it("waits while the menu is not loaded yet", () => {
        const calls = serve();
        const store = renderWizard("notLoaded");

        expect(screen.queryByText("ახალი სასწავლო წლის დამატების უფლება არ გაქვთ")).not.toBeInTheDocument();
        expect(screen.queryByText("1. სასწავლო წლის დამატება")).not.toBeInTheDocument();
        expect(store.getState().academicYearApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("waits while the menu loads", () => {
        const calls = serve();
        const store = renderWizard("loading");

        expect(screen.queryByText("ახალი სასწავლო წლის დამატების უფლება არ გაქვთ")).not.toBeInTheDocument();
        expect(screen.queryByText("1. სასწავლო წლის დამატება")).not.toBeInTheDocument();
        expect(store.getState().academicYearApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("shows the years with their counts, the current one and the horizon", async () => {
        serve();
        renderWizard();

        const table = (await screen.findAllByRole("table"))[0];
        expect(
            within(table)
                .getAllByRole("row")
                .map((r) => Array.from(r.querySelectorAll("th,td")).map((c) => c.textContent))
        ).toEqual([
            ["სასწავლო წელი", "დაწყება", "დასრულება", "კონტრაქტები", "ჯგუფები", "დაუხურავი ჯგუფები"],
            ["2025-2026", "01.09.2025", "01.09.2026", "130", "56", "0"],
            ["2026-2027 (მიმდინარე)", "01.09.2026", "01.09.2027", "130", "56", "56"],
        ]);
        expect(screen.getByText(/ბოლო სამუშაო თვე: 01.11.2027, გაკვეთილები იქმნება 30.11.2027-მდე/)).toBeInTheDocument();
    });

    // step 1: a preview first, the year is added only after it and a confirmation
    it("adds the year after the preview and the confirmation", async () => {
        const calls = serve();
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        expect(button(/წლის დამატება/)).toBeDisabled();

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        expect(
            await screen.findByText(/დაემატება სასწავლო წელი/, { exact: false })
        ).toHaveTextContent("დაემატება სასწავლო წელი 2027-2028: 01.09.2027 – 01.09.2028, კონტრაქტის ნომრები 7.001-დან.");
        fireEvent.click(button(/წლის დამატება/));
        await confirm();

        expect(await screen.findByText(/დაემატა სასწავლო წელი/)).toBeInTheDocument();
        expect(posts(calls)).toEqual([
            `${testBaseUrl}/academicyear/create?dryRun=true`,
            `${testBaseUrl}/academicyear/create?dryRun=false`,
        ]);
        //the added year is no preview: it cannot be added again
        expect(button(/წლის დამატება/)).toBeDisabled();
        //the years are loaded again
        await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/academicyear/info"))).toHaveLength(2));
    });

    // after the new year is added, the year to close is again the one before the last: the new year's predecessor
    it("offers the predecessor of the added year to close", async () => {
        let added = false;
        mockFetch((call) => {
            const dryRun = call.url.includes("dryRun=true");
            if (call.url.endsWith("/academicyear/info"))
                return {
                    status: 200,
                    body: added
                        ? { ...wizardInfo, academicYears: [...wizardInfo.academicYears, yearInfo(12, 2027)] }
                        : wizardInfo,
                };
            if (call.url.includes("/academicyear/create")) {
                added = !dryRun;
                return { status: 200, body: newYear(dryRun) };
            }
            if (call.url.includes("/closegroups"))
                return { status: 200, body: closeResult(dryRun, [closeGroup(41)]) };
            return { status: 404, body: {} };
        });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).value).toBe("10");
        //a preview of the old choice is dropped with it
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);
        fireEvent.click(button(/წლის დამატება/));
        await confirm();

        await waitFor(() => expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).value).toBe("11"));
        expect(screen.getByLabelText("გაუქმების თარიღი")).toHaveValue("2027-09-01");
        expect(screen.queryByText(/დაიხურება 1 ჯგუფი/)).not.toBeInTheDocument();
    });

    it("cannot add a year that exists", async () => {
        const calls = serve({ create: (dryRun) => ({ status: 200, body: newYear(dryRun, true) }) });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);

        expect(await screen.findByText(/ეს წელი უკვე არსებობს/)).toBeInTheDocument();
        expect(button(/წლის დამატება/)).toBeDisabled();
        expect(posts(calls)).toHaveLength(1);
    });

    it("does not add the year when the confirmation is declined", async () => {
        const calls = serve();
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);

        fireEvent.click(button(/წლის დამატება/));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "არა" }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(posts(calls)).toHaveLength(1);
    });

    it("shows the server error of a step", async () => {
        serve({
            create: () => ({
                status: 409,
                body: { title: "AcademicYearAlreadyExists", detail: "ასეთი სასწავლო წელი უკვე არსებობს", status: 409 },
            }),
        });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);

        expect(await screen.findByText(/ასეთი სასწავლო წელი უკვე არსებობს/)).toBeInTheDocument();
    });

    // step 2: the year before the last one and its end are the defaults; another year brings its own end
    it("offers the year before the last one and its end, and the end of another chosen year", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).value).toBe("10");
        expect(screen.getByLabelText("გაუქმების თარიღი")).toHaveValue("2026-09-01");

        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "11" } });

        expect(screen.getByLabelText("გაუქმების თარიღი")).toHaveValue("2027-09-01");
    });

    it("closes the groups after the preview and the confirmation", async () => {
        const calls = serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "11" } });
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);

        expect(await screen.findByText(/დაიხურება 1 ჯგუფი/)).toHaveTextContent(
            "დაიხურება 1 ჯგუფი 01.09.2027-ით. წაიშლება 1 გაკვეთილი (დარიცხვა -9.00), შეტანილი მონაცემით რჩება 1; " +
                "დაუსრულებელი სტრიქონები: 4."
        );
        const rows = within(screen.getAllByRole("table")[1]).getAllByRole("row");
        expect(Array.from(rows[1].querySelectorAll("td")).map((c) => c.textContent)).toEqual([
            "G41",
            "English",
            "",
            "1 / 2 / 1",
            "1",
            "1",
            "-9.00",
        ]);

        fireEvent.click(button(/ჯგუფების დახურვა/));
        await confirm();

        expect(await screen.findByText(/დაიხურა 1 ჯგუფი/)).toHaveTextContent(
            "დაიხურა 1 ჯგუფი 01.09.2027-ით. წაიშალა 1 გაკვეთილი (დარიცხვა -9.00)"
        );
        expect(posts(calls)).toEqual([
            `${testBaseUrl}/academicyear/11/closegroups?closeDate=2027-09-01&dryRun=true`,
            `${testBaseUrl}/academicyear/11/closegroups?closeDate=2027-09-01&dryRun=false`,
        ]);
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();
    });

    it("has nothing to close when every group is closed", async () => {
        serve({ close: (dryRun) => ({ status: 200, body: closeResult(dryRun, []) as ICloseAcademicYearGroups }) });
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);

        expect(await screen.findByText(/დაიხურება 0 ჯგუფი/)).toBeInTheDocument();
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();
    });

    // a new date or year needs a new preview
    it("forgets the preview when the date changes", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);

        fireEvent.change(screen.getByLabelText("გაუქმების თარიღი"), { target: { value: "2026-07-01" } });

        expect(screen.queryByText(/დაიხურება 1 ჯგუფი/)).not.toBeInTheDocument();
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();
    });

    it("shows a load error", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Boom", detail: "server failed", status: 500 } }));
        renderWizard();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    // an error left by another page is not shown here
    it("clears an old mutation error when it opens", async () => {
        serve();
        const store = createAcademicYearStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderWithAcademicYearStore(<NewAcademicYear />, store);

        await screen.findByText("1. სასწავლო წლის დამატება");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
        expect(store.getState().alertState.alert.ApiMutation ?? []).toEqual([]);
    });

    // without years nothing is chosen to close, so the preview cannot start
    it("offers nothing to close without years", async () => {
        mockFetch((call) =>
            call.url.endsWith("/academicyear/info")
                ? { status: 200, body: { ...wizardInfo, academicYears: [] } }
                : { status: 404, body: {} }
        );
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        const year = screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement;
        expect(year.options).toHaveLength(0);
        expect(year.value).toBe("");
        expect(screen.getByLabelText("გაუქმების თარიღი")).toHaveValue("");
        expect(screen.getAllByRole("button", { name: /გადახედვა/ })[1]).toBeDisabled();
    });

    it("cannot preview the closing without a date", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.change(screen.getByLabelText("გაუქმების თარიღი"), { target: { value: "" } });

        expect(screen.getAllByRole("button", { name: /გადახედვა/ })[1]).toBeDisabled();
    });

    it("forgets the preview when the year changes", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);

        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "11" } });

        expect(screen.queryByText(/დაიხურება 1 ჯგუფი/)).not.toBeInTheDocument();
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();
    });

    it("shows the preview of a new year exactly, as information", async () => {
        serve();
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);

        const alert = await screen.findByText(/დაემატება სასწავლო წელი/, { selector: ".alert" });
        expect(alert.textContent).toBe(
            "დაემატება სასწავლო წელი 2027-2028: 01.09.2027 – 01.09.2028, კონტრაქტის ნომრები 7.001-დან."
        );
        expect(alert).toHaveClass("alert-info");
    });

    it("warns that the year exists", async () => {
        serve({ create: (dryRun) => ({ status: 200, body: newYear(dryRun, true) }) });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);

        const alert = await screen.findByText(/დაემატება სასწავლო წელი/, { selector: ".alert" });
        expect(alert.textContent).toBe(
            "დაემატება სასწავლო წელი 2027-2028: 01.09.2027 – 01.09.2028, კონტრაქტის ნომრები 7.001-დან. " +
                "ეს წელი უკვე არსებობს."
        );
        expect(alert).toHaveClass("alert-warning");
    });

    it("asks before it adds the year, naming it", async () => {
        serve();
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);

        fireEvent.click(button(/წლის დამატება/));

        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("სასწავლო წლის დამატება")).toBeInTheDocument();
        expect(within(dialog).getByText("დაემატება სასწავლო წელი 2027-2028. გავაგრძელო?")).toBeInTheDocument();
    });

    // the dialog closes itself; the page must forget it too, or a second click would not open it again
    it("asks again after the adding was declined", async () => {
        const calls = serve();
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);
        fireEvent.click(button(/წლის დამატება/));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "არა" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        fireEvent.click(button(/წლის დამატება/));
        await confirm();

        expect(await screen.findByText(/დაემატა სასწავლო წელი/)).toBeInTheDocument();
        expect(posts(calls)).toHaveLength(2);
    });

    it("asks again after the closing was declined", async () => {
        const calls = serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);
        fireEvent.click(button(/ჯგუფების დახურვა/));
        const dialog = await screen.findByRole("dialog");
        expect(
            within(dialog).getByText("2025-2026 წლის 1 ჯგუფი დაიხურება და 1 გაკვეთილი წაიშლება. გავაგრძელო?")
        ).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "არა" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        fireEvent.click(button(/ჯგუფების დახურვა/));
        await confirm();

        expect(await screen.findByText(/დაიხურა 1 ჯგუფი/)).toBeInTheDocument();
        expect(posts(calls)).toHaveLength(2);
    });

    it("drops an old error when the next step starts", async () => {
        let answer: (dryRun: boolean) => FetchReply = () => conflict("Old", "old error");
        serve({ create: (dryRun) => answer(dryRun), close: (dryRun) => answer(dryRun) });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        expect(await screen.findByText(/old error/)).toBeInTheDocument();

        answer = (dryRun) => ({ status: 200, body: newYear(dryRun) });
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);
        expect(screen.queryByText(/old error/)).not.toBeInTheDocument();

        answer = () => conflict("Old", "old error");
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        expect(await screen.findByText(/old error/)).toBeInTheDocument();
        answer = (dryRun) => ({ status: 200, body: closeResult(dryRun, [closeGroup(41)]) });
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);
        expect(screen.queryByText(/old error/)).not.toBeInTheDocument();
    });

    // while a step runs, its buttons wait and only its execute button spins
    it("waits while the year is previewed", async () => {
        serve({ create: () => pending() });
        renderWizard();
        await screen.findByText("1. სასწავლო წლის დამატება");
        const preview = screen.getAllByRole("button", { name: /გადახედვა/ })[0];
        expect(preview.querySelector(".spinner-border")).toBeNull();
        expect(button(/წლის დამატება/).querySelector(".spinner-border")).toBeNull();

        fireEvent.click(preview);

        await waitFor(() => expect(preview).toBeDisabled());
        expect(button(/წლის დამატება/)).toBeDisabled();
        expect(button(/წლის დამატება/).querySelector(".spinner-border")).not.toBeNull();
        expect(preview.querySelector(".spinner-border")).toBeNull();
        expect(button(/ჯგუფების დახურვა/).querySelector(".spinner-border")).toBeNull();
    });

    it("waits while the groups are previewed", async () => {
        serve({ close: () => pending() });
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        const preview = screen.getAllByRole("button", { name: /გადახედვა/ })[1];
        expect(button(/ჯგუფების დახურვა/).querySelector(".spinner-border")).toBeNull();

        fireEvent.click(preview);

        await waitFor(() => expect(preview).toBeDisabled());
        expect(button(/ჯგუფების დახურვა/)).toBeDisabled();
        expect(button(/ჯგუფების დახურვა/).querySelector(".spinner-border")).not.toBeNull();
        expect(button(/წლის დამატება/).querySelector(".spinner-border")).toBeNull();
        expect(screen.getAllByRole("button", { name: /გადახედვა/ })[0]).toBeEnabled();
    });

    it("shows no table when nothing is closed", async () => {
        serve({ close: (dryRun) => ({ status: 200, body: closeResult(dryRun, []) }) });
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);

        await screen.findByText(/დაიხურება 0 ჯგუფი/);
        expect(screen.getAllByRole("table")).toHaveLength(1);
    });

    // a preview adds no year, so the year to close and its preview stay
    it("keeps the closing step when the new year is only previewed", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "11" } });
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[0]);
        await screen.findByText(/დაემატება სასწავლო წელი/);

        expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).value).toBe("11");
        expect(screen.getByText(/დაიხურება 1 ჯგუფი/)).toBeInTheDocument();
    });

    it("names the chosen year when it asks before closing", async () => {
        serve();
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");
        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "11" } });
        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);
        await screen.findByText(/დაიხურება 1 ჯგუფი/);

        fireEvent.click(button(/ჯგუფების დახურვა/));

        const dialog = await screen.findByRole("dialog");
        expect(
            within(dialog).getByText("2026-2027 წლის 1 ჯგუფი დაიხურება და 1 გაკვეთილი წაიშლება. გავაგრძელო?")
        ).toBeInTheDocument();
    });

    // a date alone is not enough: there is no year to close
    it("cannot preview the closing without a year, even with a date", async () => {
        mockFetch((call) =>
            call.url.endsWith("/academicyear/info")
                ? { status: 200, body: { ...wizardInfo, academicYears: [] } }
                : { status: 404, body: {} }
        );
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.change(screen.getByLabelText("გაუქმების თარიღი"), { target: { value: "2027-09-01" } });

        expect(screen.getAllByRole("button", { name: /გადახედვა/ })[1]).toBeDisabled();
    });

    // the generator's other errors are no lessons kept for their data
    it("counts only the lessons kept for their data", async () => {
        const group = closeGroup(41);
        serve({
            close: (dryRun) => ({
                status: 200,
                body: closeResult(dryRun, [
                    {
                        ...group,
                        generation: {
                            ...group.generation,
                            errors: [
                                ...group.generation.errors,
                                { errorCode: 1, errorText: "other", lessonDate: null, lessonId: null },
                            ],
                        },
                    },
                ]),
            }),
        });
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);

        expect(await screen.findByText(/დაიხურება 1 ჯგუფი/)).toHaveTextContent("შეტანილი მონაცემით რჩება 1;");
        const row = within(screen.getAllByRole("table")[1]).getAllByRole("row")[1];
        expect(Array.from(row.querySelectorAll("td")).map((c) => c.textContent)[5]).toBe("1");
    });

    it("shows a group's earlier void date", async () => {
        serve({
            close: (dryRun) => ({
                status: 200,
                body: closeResult(dryRun, [closeGroup(41, { previousVoidDate: "2027-12-01T00:00:00" })]),
            }),
        });
        renderWizard();
        await screen.findByText("2. წინა წლის ჯგუფების დახურვა");

        fireEvent.click(screen.getAllByRole("button", { name: /გადახედვა/ })[1]);

        await screen.findByText(/დაიხურება 1 ჯგუფი/);
        const row = within(screen.getAllByRole("table")[1]).getAllByRole("row")[1];
        expect(Array.from(row.querySelectorAll("td")).map((c) => c.textContent)[2]).toBe("01.12.2027");
    });
});
