//Reports.test.tsx

import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { mockFetch, testBaseUrl, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { captureDownloads, mockFetchFiles, type FileReply } from "../testUtils/salaryTestStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    createReportsStore,
    renderReportsOnRoute,
    reportCatalog,
    reportLookups,
    roomsReport,
} from "../testUtils/reportsTestStore";
import Reports from "./Reports";

const base = `${testBaseUrl}/reports`;

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 2, 15, 30));
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

//the catalog, the lookups and the reports, as the server answers them
function serve(report: (call: FetchCall) => FetchReply | Promise<FetchReply> = () => ({ status: 200, body: roomsReport() })) {
    return mockFetch((call) => {
        if (call.url === `${base}/catalog`) return { status: 200, body: reportCatalog };
        if (call.url === `${base}/lookups`) return { status: 200, body: reportLookups };
        return report(call);
    });
}

function renderPage(url = "/reports", menu: MenuState = "withRight") {
    const store = createReportsStore(menu);
    renderReportsOnRoute(<Reports />, store, url);
    return store;
}

function BackButton() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>back</button>;
}

const location = () => screen.getByTestId("location").textContent ?? "";
const viewButton = () => screen.getByRole("button", { name: /^ნახვა/ }) as HTMLButtonElement;
const printButton = () => screen.getByRole("button", { name: "ბეჭდვა" }) as HTMLButtonElement;
const excelButton = () => screen.getByRole("button", { name: /^Excel/ }) as HTMLButtonElement;
const categorySelect = () => screen.getByLabelText("კატეგორია") as HTMLSelectElement;
const reportSelect = () => screen.getByLabelText("რეპორტი") as HTMLSelectElement;
const optionNames = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.textContent);
const chooseCategory = (key: string) => fireEvent.change(categorySelect(), { target: { value: key } });
const chooseReport = (key: string) => fireEvent.change(reportSelect(), { target: { value: key } });

describe("Reports", () => {
    it("says when the user has no right and loads nothing", async () => {
        const calls = serve();
        const store = renderPage("/reports", "withoutRight");

        expect(await screen.findByText("რეპორტების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(store.getState().reportsApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("waits while the menu loads", () => {
        const calls = serve();
        const store = renderPage("/reports", "loading");

        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(screen.queryByText("რეპორტების ნახვის უფლება არ გაქვთ")).not.toBeInTheDocument();
        expect(screen.queryByText("კატეგორია")).not.toBeInTheDocument();
        expect(store.getState().reportsApi.queries).toEqual({});
        expect(calls).toHaveLength(0);
    });

    it("shows a catalog load error", async () => {
        mockFetch(() => ({ status: 500, body: { title: "Boom", detail: "server failed", status: 500 } }));
        renderPage();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });

    // the menu item is there, but no report's own right; without a report there are no lookups to load
    it("says when the user has no report", async () => {
        mockFetch(() => ({ status: 200, body: { categories: [], reports: [] } }));
        const store = renderPage();

        expect(await screen.findByText("რეპორტების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(Object.keys(store.getState().reportsApi.queries)).toEqual(["getReportCatalog(undefined)"]);
    });

    it("says when the category has no report", async () => {
        mockFetch(() => ({
            status: 200,
            body: { categories: [{ key: "all", name: "ყველა", reportKeys: [] }], reports: [] },
        }));
        renderPage();

        expect(await screen.findByText("რეპორტების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
    });

    it("waits while the catalog loads", async () => {
        mockFetch(() => new Promise<FetchReply>(() => undefined));
        const store = renderPage();

        await waitFor(() =>
            expect(store.getState().reportsApi.queries["getReportCatalog(undefined)"]?.status).toBe("pending")
        );
        expect(screen.getByText("მიმდინარეობს ჩატვირთვა...")).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
    });

    // choosing changes the link without new history entries: back leaves the page
    it("keeps one history entry while choosing", async () => {
        serve();
        const store = createReportsStore();
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/start", "/reports"]} initialIndex={1}>
                    <Routes>
                        <Route path="/start" element={<p>start page</p>} />
                        <Route path="/reports" element={<Reports />} />
                    </Routes>
                    <BackButton />
                </MemoryRouter>
            </Provider>
        );
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        chooseCategory("checks");
        await screen.findByRole("heading", { name: "ოთახების გადაფარვა" });

        fireEvent.click(screen.getByRole("button", { name: "back" }));

        expect(await screen.findByText("start page")).toBeInTheDocument();
    });

    // like Access's FrmMain: the first category and its first report, today's date
    it("selects the first category and report and shows its filter", async () => {
        const calls = serve();
        renderPage();

        expect(await screen.findByRole("heading", { name: "ოთახების ცხრილი" })).toBeInTheDocument();
        expect(categorySelect()).toHaveValue("all");
        expect(optionNames(categorySelect())).toEqual(["ყველა", "გაკვეთილების ცხრილი", "შემოწმება"]);
        expect(reportSelect()).toHaveValue("r03RoomsAgenda");
        expect(optionNames(reportSelect())).toEqual(["ოთახების ცხრილი", "ოთახების გადაფარვა", "პერიოდის რეპორტი"]);
        expect(screen.getByText("ოთახების გაკვეთილები კვირის დღეების მიხედვით").tagName).toBe("P");
        expect(screen.queryByText(/შევსებული უნდა იყოს/)).not.toBeInTheDocument();
        expect((screen.getByLabelText("თარიღისთვის") as HTMLInputElement).value).toBe("2026-10-02");
        expect(screen.getByLabelText("თარიღისთვის")).toBeRequired();
        expect(screen.queryByLabelText("თარიღიდან")).not.toBeInTheDocument();
        expect(viewButton()).toBeEnabled();
        expect(printButton()).toBeDisabled();
        expect(excelButton()).toBeEnabled();
        //only the reports with a teacher, course or student need the lookups
        expect(calls.map((c) => c.url)).toEqual([`${base}/catalog`]);
    });

    it("selects a category and its first report", async () => {
        serve();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        chooseCategory("checks");

        expect(await screen.findByRole("heading", { name: "ოთახების გადაფარვა" })).toBeInTheDocument();
        expect(categorySelect()).toHaveValue("checks");
        //the reports list is filtered by the category
        expect(reportSelect()).toHaveValue("r06RoomOver");
        expect(optionNames(reportSelect())).toEqual(["ოთახების გადაფარვა", "პერიოდის რეპორტი"]);
        expect(location()).toContain("category=checks");
        expect(location()).not.toContain("report=");
    });

    it("selects a report of the category", async () => {
        serve();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        chooseReport("r06RoomOver");

        expect(await screen.findByRole("heading", { name: "ოთახების გადაფარვა" })).toBeInTheDocument();
        expect(reportSelect()).toHaveValue("r06RoomOver");
        expect(location()).toContain("category=all&report=r06RoomOver");
    });

    // the filter in the link opens the page with it
    it("opens the category, report and date of the link", async () => {
        serve();
        renderPage("/reports?category=schedule&report=r06RoomOver&endDate=2026-09-20");

        expect(await screen.findByRole("heading", { name: "ოთახების გადაფარვა" })).toBeInTheDocument();
        expect(categorySelect()).toHaveValue("schedule");
        expect(optionNames(reportSelect())).toEqual(["ოთახების ცხრილი", "ოთახების გადაფარვა"]);
        expect(reportSelect()).toHaveValue("r06RoomOver");
        expect((screen.getByLabelText("თარიღისთვის") as HTMLInputElement).value).toBe("2026-09-20");
    });

    it("shows the report for the date", async () => {
        const calls = serve();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.change(screen.getByLabelText("თარიღისთვის"), { target: { value: "2026-09-20" } });
        fireEvent.click(viewButton());

        const view = await screen.findByTestId("reportView");
        expect(within(view).getByText("თარიღისთვის: 02.10.2026")).toBeInTheDocument();
        expect(within(view).getAllByRole("row")).toHaveLength(3);
        expect(calls.map((c) => c.url)).toEqual([
            `${base}/catalog`,
            `${base}/r03RoomsAgenda?endDate=2026-09-20`,
        ]);
        expect(location()).toContain("endDate=2026-09-20");
        expect(printButton()).toBeEnabled();
    });

    // Enter in the filter shows the report too
    it("shows the report when the filter is submitted", async () => {
        const calls = serve();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        const form = screen.getByLabelText("თარიღისთვის").closest("form")!;
        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
        expect(await screen.findByTestId("reportView")).toBeInTheDocument();
        expect(calls.map((c) => c.url)).toContain(`${base}/r03RoomsAgenda?endDate=2026-10-02`);
    });

    it("shows the report again from the server", async () => {
        let count = 0;
        const calls = serve(() => {
            count++;
            return { status: 200, body: roomsReport({ title: `ოთახების ცხრილი ${count}` }) };
        });
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.click(viewButton());
        expect(await screen.findByText("ოთახების ცხრილი 1")).toBeInTheDocument();
        fireEvent.click(viewButton());

        expect(await screen.findByText("ოთახების ცხრილი 2")).toBeInTheDocument();
        expect(calls.filter((c) => c.url.includes("r03RoomsAgenda"))).toHaveLength(2);
    });

    it("waits for the report with a spinner and a disabled button", async () => {
        serve(() => new Promise<FetchReply>(() => undefined));
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        expect(viewButton().querySelector(".spinner-border")).toBeNull();

        fireEvent.click(viewButton());

        await waitFor(() => expect(viewButton()).toBeDisabled());
        expect(viewButton().querySelector(".spinner-border")).not.toBeNull();
        expect(excelButton().querySelector(".spinner-border")).toBeNull();
        expect(printButton()).toBeDisabled();
        expect(screen.queryByTestId("reportView")).not.toBeInTheDocument();
    });

    // another report's result is not shown under this report's title
    it("hides the result when another report is chosen", async () => {
        serve();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        fireEvent.click(viewButton());
        await screen.findByTestId("reportView");

        chooseReport("r06RoomOver");

        await screen.findByRole("heading", { name: "ოთახების გადაფარვა" });
        expect(screen.queryByTestId("reportView")).not.toBeInTheDocument();
        expect(printButton()).toBeDisabled();
    });

    it("does not show a report without the date", async () => {
        serve();
        const store = renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.change(screen.getByLabelText("თარიღისთვის"), { target: { value: "" } });

        expect(screen.getByText("„თარიღისთვის\" შევსებული უნდა იყოს")).toBeInTheDocument();
        expect(viewButton()).toBeDisabled();
        expect(excelButton()).toBeDisabled();
        //a started request would be in the store at once
        fireEvent.submit(viewButton().closest("form")!);
        expect(Object.keys(store.getState().reportsApi.queries)).toEqual(["getReportCatalog(undefined)"]);
    });

    it("shows the report's error under the filter", async () => {
        serve(() => ({ status: 400, body: { title: "ParameterIsRequired", detail: "no date", status: 400 } }));
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.click(viewButton());

        expect(await screen.findByText(/no date|ParameterIsRequired/)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "ოთახების ცხრილი" })).toBeInTheDocument();
    });

    // a new run clears the old error
    it("clears an old error when the report is shown again", async () => {
        serve();
        const store = renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        expect(await screen.findByText("old error")).toBeInTheDocument();

        fireEvent.click(viewButton());

        await screen.findByTestId("reportView");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
    });

    // an error left by another page is not shown here
    it("clears an error of another page when it opens", async () => {
        serve();
        const store = createReportsStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Other", errorMessage: "other page error" }]));
        renderReportsOnRoute(<Reports />, store, "/reports");

        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        expect(screen.queryByText("other page error")).not.toBeInTheDocument();
    });

    it("prints the shown report", async () => {
        serve();
        const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        fireEvent.click(viewButton());
        await screen.findByTestId("reportView");

        fireEvent.click(printButton());

        expect(print).toHaveBeenCalledTimes(1);
    });

    it("downloads the Excel file of the filter", async () => {
        const calls = mockFetchFiles((call): FileReply => {
            if (call.url === `${base}/catalog`) return { status: 200, text: JSON.stringify(reportCatalog), headers: { "Content-Type": "application/json" } };
            return { status: 200, text: "xlsx" };
        });
        const saved = captureDownloads();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.change(screen.getByLabelText("თარიღისთვის"), { target: { value: "2026-09-20" } });
        fireEvent.click(excelButton());

        await waitFor(() => expect(saved.map((s) => s.fileName)).toEqual(["r03RoomsAgenda_2026-09-20.xlsx"]));
        expect(calls.map((c) => c.url)).toContain(`${base}/r03RoomsAgenda/excel?endDate=2026-09-20`);
    });

    // a new download clears the old error
    it("clears an old error when the file is downloaded", async () => {
        mockFetchFiles((call): FileReply => {
            if (call.url === `${base}/catalog`) return { status: 200, text: JSON.stringify(reportCatalog), headers: { "Content-Type": "application/json" } };
            return { status: 200, text: "xlsx" };
        });
        const saved = captureDownloads();
        const store = renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        expect(await screen.findByText("old error")).toBeInTheDocument();

        fireEvent.click(excelButton());

        await waitFor(() => expect(saved).toHaveLength(1));
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
    });

    it("waits for the file with a spinner on its button", async () => {
        mockFetchFiles((call): FileReply | Promise<FileReply> => {
            if (call.url === `${base}/catalog`) return { status: 200, text: JSON.stringify(reportCatalog), headers: { "Content-Type": "application/json" } };
            return new Promise<FileReply>(() => undefined);
        });
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.click(excelButton());

        await waitFor(() => expect(excelButton()).toBeDisabled());
        expect(excelButton().querySelector(".spinner-border")).not.toBeNull();
        expect(viewButton().querySelector(".spinner-border")).toBeNull();
    });

    it("shows the file's error under the filter", async () => {
        mockFetchFiles((call): FileReply => {
            if (call.url === `${base}/catalog`) return { status: 200, text: JSON.stringify(reportCatalog), headers: { "Content-Type": "application/json" } };
            return {
                status: 403,
                text: JSON.stringify([{ code: "InsufficientRights", name: "უფლება არ გაქვთ" }]),
                headers: { "Content-Type": "application/json" },
            };
        });
        const saved = captureDownloads();
        renderPage();
        await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

        fireEvent.click(excelButton());

        expect(await screen.findByText(/უფლება არ გაქვთ/)).toBeInTheDocument();
        expect(saved).toEqual([]);
    });

    // a period report with the three lookups (part 18's kind): the lists load only for it
    describe("a report with a period and lookups", () => {
        async function openPeriodReport() {
            const calls = serve();
            renderPage("/reports?category=checks&report=rPeriod");
            await screen.findByRole("heading", { name: "პერიოდის რეპორტი" });
            return calls;
        }

        it("shows the period from the first of the month and loads the lookups", async () => {
            const calls = await openPeriodReport();

            expect((screen.getByLabelText("თარიღიდან") as HTMLInputElement).value).toBe("2026-10-01");
            expect((screen.getByLabelText("თარიღამდე") as HTMLInputElement).value).toBe("2026-10-02");
            await waitFor(() => expect(calls.map((c) => c.url)).toContain(`${base}/lookups`));
            expect((screen.getByLabelText("მასწავლებელი") as HTMLInputElement).placeholder).toBe("ყველა");
            expect(screen.getByLabelText("საგანი")).toBeInTheDocument();
            expect(screen.getByLabelText("მოსწავლე")).toBeInTheDocument();
        });

        it("sends the chosen teacher, course and student", async () => {
            const calls = await openPeriodReport();
            await waitFor(() => expect(calls.map((c) => c.url)).toContain(`${base}/lookups`));

            for (const [label, name] of [
                ["მასწავლებელი", "Beta Bob / T6"],
                ["საგანი", "Math"],
                ["მოსწავლე", "Gamma Gia / 6.020"],
            ]) {
                fireEvent.focus(screen.getByLabelText(label));
                fireEvent.mouseDown(await screen.findByText(name));
            }
            fireEvent.click(viewButton());

            await screen.findByTestId("reportView");
            expect(calls.map((c) => c.url)).toContain(
                `${base}/rPeriod?startDate=2026-10-01&endDate=2026-10-02&teacherId=6&courseId=3&studentId=20`
            );
        });

        it("does not show a report whose start is after its end", async () => {
            await openPeriodReport();

            fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "2026-10-05" } });

            expect(screen.getByText("„თარიღიდან\" „თარიღამდე\"-ზე გვიან არის")).toBeInTheDocument();
            expect(viewButton()).toBeDisabled();
            expect(excelButton()).toBeDisabled();
        });

        it("names the missing start date", async () => {
            await openPeriodReport();

            fireEvent.change(screen.getByLabelText("თარიღიდან"), { target: { value: "" } });

            expect(screen.getByText("„თარიღიდან\" შევსებული უნდა იყოს")).toBeInTheDocument();
        });

        // without its lookups yet, a picker has no items
        it("shows empty pickers until the lookups load", async () => {
            mockFetch((call) => {
                if (call.url === `${base}/catalog`) return { status: 200, body: reportCatalog };
                return new Promise<FetchReply>(() => undefined);
            });
            renderPage("/reports?category=checks&report=rPeriod");
            await screen.findByRole("heading", { name: "პერიოდის რეპორტი" });

            fireEvent.focus(screen.getByLabelText("მასწავლებელი"));

            expect(screen.getByText("ვერ მოიძებნა")).toBeInTheDocument();
        });
    });

    // a check report with the optional academic year (part 20): the global year by default, "all" without the year
    describe("a check report with an academic year", () => {
        const yearReport = {
            key: "rYear",
            title: "წლის შემოწმება",
            description: null,
            parameters: [{ name: "academicYearId", caption: "სასწავლო წელი", required: false }],
        } as const;

        async function openYearReport() {
            const calls = mockFetch((call) => {
                if (call.url === `${base}/catalog`)
                    return {
                        status: 200,
                        body: {
                            categories: [{ key: "checks", name: "შემოწმება", reportKeys: ["rYear"] }],
                            reports: [yearReport],
                        },
                    };
                if (call.url === `${base}/lookups`) return { status: 200, body: reportLookups };
                if (call.url === `${testBaseUrl}/academicyears`)
                    return {
                        status: 200,
                        body: {
                            academicYears: [
                                { id: 10, name: "2025-2026" },
                                { id: 11, name: "2026-2027" },
                            ],
                            currentAcademicYearId: 11,
                        },
                    };
                return { status: 200, body: roomsReport() };
            });
            renderPage("/reports?category=checks&report=rYear");
            await screen.findByRole("heading", { name: "წლის შემოწმება" });
            await waitFor(() => expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).value).toBe("11"));
            return calls;
        }

        async function viewedUrl(calls: FetchCall[]) {
            fireEvent.click(viewButton());
            await screen.findByTestId("reportView");
            return calls.map((c) => c.url).filter((url) => url.startsWith(`${base}/rYear`));
        }

        it("sends the current year by default", async () => {
            const calls = await openYearReport();

            expect(await viewedUrl(calls)).toEqual([`${base}/rYear?academicYearId=11`]);
        });

        it("sends another chosen year", async () => {
            const calls = await openYearReport();

            fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "10" } });

            expect(await viewedUrl(calls)).toEqual([`${base}/rYear?academicYearId=10`]);
            expect(location()).toContain("academicYearId=10");
            expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("10");
        });

        it("sends no year for all years", async () => {
            const calls = await openYearReport();

            fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "all" } });

            expect(await viewedUrl(calls)).toEqual([`${base}/rYear`]);
            expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("all");
        });

        // without a current (or chosen) year the check covers every year
        it("checks every year when there is no current year", async () => {
            const calls = mockFetch((call) => {
                if (call.url === `${base}/catalog`)
                    return {
                        status: 200,
                        body: {
                            categories: [{ key: "checks", name: "შემოწმება", reportKeys: ["rYear"] }],
                            reports: [yearReport],
                        },
                    };
                if (call.url === `${base}/lookups`) return { status: 200, body: reportLookups };
                if (call.url === `${testBaseUrl}/academicyears`)
                    return {
                        status: 200,
                        body: { academicYears: [{ id: 11, name: "2026-2027" }], currentAcademicYearId: null },
                    };
                return { status: 200, body: roomsReport() };
            });
            renderPage("/reports?category=checks&report=rYear");
            await waitFor(() => expect(calls.map((c) => c.url)).toContain(`${testBaseUrl}/academicyears`));

            await waitFor(() =>
                expect((screen.getByLabelText("სასწავლო წელი") as HTMLSelectElement).options).toHaveLength(2)
            );
            expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("all");
            expect(await viewedUrl(calls)).toEqual([`${base}/rYear`]);
        });

        // the list of years is loaded only for a report with the year
        it("loads no years for a report without the year", async () => {
            const calls = serve();
            renderPage();
            await screen.findByRole("heading", { name: "ოთახების ცხრილი" });

            fireEvent.click(viewButton());
            await screen.findByTestId("reportView");

            expect(calls.map((c) => c.url)).not.toContain(`${testBaseUrl}/academicyears`);
        });

        // a report without parameters has no year either
        it("loads no years for a report without parameters", async () => {
            const calls = mockFetch((call) => {
                if (call.url === `${base}/catalog`)
                    return {
                        status: 200,
                        body: {
                            categories: [{ key: "checks", name: "შემოწმება", reportKeys: ["rNone"] }],
                            reports: [{ key: "rNone", title: "უპარამეტრო შემოწმება", description: null, parameters: [] }],
                        },
                    };
                return { status: 200, body: roomsReport() };
            });
            renderPage("/reports?category=checks&report=rNone");
            await screen.findByRole("heading", { name: "უპარამეტრო შემოწმება" });

            fireEvent.click(viewButton());
            await screen.findByTestId("reportView");

            expect(calls.map((c) => c.url)).not.toContain(`${testBaseUrl}/academicyears`);
        });
    });
});
