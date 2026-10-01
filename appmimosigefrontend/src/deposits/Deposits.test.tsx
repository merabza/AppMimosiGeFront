//Deposits.test.tsx

import { StrictMode } from "react";
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { mockFetch, type FetchCall, type FetchReply } from "../testUtils/testStore";
import { setMenuLoading, setNavMenu } from "../appcarcass/redux/slices/navMenuSlice";
import { mainMenu, type MenuState } from "../testUtils/studentContractsTestStore";
import {
    balancesLookups,
    createBalancesStore,
    depositRow,
    depositsParams,
    recountResult,
    renderBalancesOnRoute,
} from "../testUtils/balancesTestStore";
import type { IDeposits } from "../redux/types/balancesTypes";
import { defaultDateTo } from "./depositsFilter";
import Deposits from "./Deposits";

const deposits: IDeposits = {
    totalBalance: -74.5,
    totalFourWeekFee: 372,
    rows: [
        depositRow(),
        depositRow({
            studentContractId: 12,
            academicYearId: 10,
            studentName: "Gamma Gia",
            contractNumber: "5.001",
            balance: -20.5,
            studentPhone: null,
            payerName: "Gamma Gia",
            payerPhone: "32123456",
            nextLessonDate: null,
            crmMustPayDate: null,
            fourWeekFee: 48,
            desiredMonthlyPaymentDay: null,
            desiredNextPayDate: null,
            desiredAfterNextPayDate: null,
            desiredDayAmount: null,
            stopDate: null,
            mustPayToEnd: null,
            endDate: null,
        }),
    ],
};

type Replies = {
    recount?: () => FetchReply | Promise<FetchReply>;
    fullRecount?: () => FetchReply | Promise<FetchReply>;
    rows?: () => FetchReply | Promise<FetchReply>;
    lookups?: () => FetchReply | Promise<FetchReply>;
};

function serve(replies: Replies = {}): FetchCall[] {
    return mockFetch((call) => {
        if (call.url.endsWith("/deposits/recount"))
            return replies.recount?.() ?? { status: 200, body: recountResult };
        if (call.url.endsWith("/deposits/fullrecount"))
            return replies.fullRecount?.() ?? { status: 200, body: { ...recountResult, groupsCount: 51 } };
        if (call.url.includes("/formlookups")) return replies.lookups?.() ?? { status: 200, body: balancesLookups };
        return replies.rows?.() ?? { status: 200, body: deposits };
    });
}

function renderPage(url = "/deposits", menu: MenuState = "withRight", appClaims?: string[]) {
    const store = createBalancesStore(menu, appClaims);
    renderBalancesOnRoute(<Deposits />, store, "/deposits", url);
    return store;
}

const rowsRequests = (calls: FetchCall[]) => calls.filter((c) => c.url.includes("/deposits/rows"));

function lastRowsParams(calls: FetchCall[]) {
    const requests = rowsRequests(calls);
    return depositsParams(requests[requests.length - 1].url);
}

const location = () => screen.getByTestId("location").textContent ?? "";
const loadingText = "მიმდინარეობს ჩატვირთვა...";
const rowCells = (scId: number) =>
    within(screen.getByTestId(`deposit-${scId}`))
        .getAllByRole("cell")
        .map((c) => c.textContent);

describe("Deposits", () => {
    // Access FrmDeposites Form_Open: first the dirty groups' lessons and the dirty contracts' next pay dates
    it("recounts the dirty ones before it loads the rows", async () => {
        let finishRecount: (reply: FetchReply) => void = () => {};
        const calls = serve({ recount: () => new Promise<FetchReply>((resolve) => (finishRecount = resolve)) });
        renderPage();

        await waitFor(() => expect(calls.map((c) => [c.method, c.url.split("/api/v1")[1]])).toContainEqual(["POST", "/deposits/recount"]));
        expect(await screen.findByText(/გაკვეთილები და შემდეგი გადახდის თარიღები გადაითვლება/)).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(0);
        //the rows are not loading yet: only the recount message shows
        expect(screen.queryByText(loadingText)).not.toBeInTheDocument();

        act(() => finishRecount({ status: 200, body: recountResult }));

        expect(await screen.findByTestId("deposit-10")).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(1);
        expect(screen.queryByText(/გადაითვლება/)).not.toBeInTheDocument();
        expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
    });

    // the menu may arrive after the page: the recount waits for the right
    it("recounts once the menu has loaded", async () => {
        const calls = serve();
        const store = renderPage("/deposits", "loading");
        expect(calls).toHaveLength(0);

        act(() => {
            store.dispatch(setNavMenu(mainMenu("deposits")));
            store.dispatch(setMenuLoading(false));
        });

        expect(await screen.findByTestId("deposit-10")).toBeInTheDocument();
        expect(calls.filter((c) => c.url.endsWith("/deposits/recount"))).toHaveLength(1);
    });

    // React's StrictMode runs the effects twice in development
    it("recounts once in StrictMode", async () => {
        const calls = serve();
        const store = createBalancesStore();
        render(
            <StrictMode>
                <Provider store={store}>
                    <MemoryRouter initialEntries={["/deposits"]}>
                        <Routes>
                            <Route path="/deposits" element={<Deposits />} />
                        </Routes>
                    </MemoryRouter>
                </Provider>
            </StrictMode>
        );

        await screen.findByTestId("deposit-10");
        expect(calls.filter((c) => c.url.endsWith("/deposits/recount"))).toHaveLength(1);
    });

    it("shows what the recount did", async () => {
        serve();
        renderPage();

        expect((await screen.findByTestId("recountSummary")).textContent).toBe(
            "გადაითვალა: ჯგუფები 26 (შეიცვალა 22), კონტრაქტები 121 (შეიცვალა 39)"
        );
    });

    it("tells about the generator errors", async () => {
        serve({ recount: () => ({ status: 200, body: { ...recountResult, groupErrorsCount: 6 } }) });
        renderPage();

        expect((await screen.findByTestId("recountSummary")).textContent).toBe(
            "გადაითვალა: ჯგუფები 26 (შეიცვალა 22), კონტრაქტები 121 (შეიცვალა 39), გენერატორის შეცდომები: 6 (გენერატორის ლოგშია)"
        );
    });

    // as Access went on to the form after a failed recount
    it("loads the rows after a failed recount and shows the error", async () => {
        const calls = serve({
            //500-ზე carcass ზოგად ტექსტს აჩვენებს, ამიტომ 409
            recount: () => ({ status: 409, body: { title: "RecountFailed", detail: "the recount failed", status: 409 } }),
        });
        renderPage();

        expect(await screen.findByTestId("deposit-10")).toBeInTheDocument();
        expect(screen.getByText("the recount failed")).toBeInTheDocument();
        expect(rowsRequests(calls)).toHaveLength(1);
        expect(screen.queryByTestId("recountSummary")).not.toBeInTheDocument();
    });

    // Access: maximum 0, date to today + 5 days; here also the current academic year
    it("loads the current year with maximum 0 until five days ahead by default", async () => {
        const calls = serve();
        renderPage();

        await screen.findByTestId("deposit-10");
        expect(lastRowsParams(calls)).toEqual({ academicYearId: "11", maximum: "0", dateTo: defaultDateTo() });
        expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("11");
        expect(screen.getByLabelText("მაქსიმუმი")).toHaveValue(0);
        expect(screen.getByLabelText("თარიღამდე")).toHaveValue(defaultDateTo());
    });

    it("shows a contract's columns in order", async () => {
        serve();
        renderPage("/deposits?academicYearId=&maximum=0&dateTo=2026-10-06&filter=");

        await screen.findByTestId("deposit-10");
        expect(rowCells(10)).toEqual([
            "Alpha Ann",
            "6.001",
            "-54.00",
            "555-12-34-56",
            "Beta Bob",
            "599-00-01-11",
            "02.10.2026 16:30",
            "05.10.2026",
            "324.00",
            "15",
            "15.10.2026",
            "16.11.2026",
            "120.50",
            "02.10.2026 16:30",
            "4968.00",
            "01.12.2027",
            "ამონაწერი",
        ]);
        expect(rowCells(12)).toEqual([
            "Gamma Gia",
            "5.001",
            "-20.50",
            "",
            "Gamma Gia",
            "32123456",
            "",
            "",
            "48.00",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "ამონაწერი",
        ]);
    });

    // Access opened the statement with the contract and the deposits' "date to"
    it("opens the contract's statement until the chosen date", async () => {
        serve();
        renderPage("/deposits?academicYearId=&maximum=0&dateTo=2026-10-06&filter=");

        await screen.findByTestId("deposit-12");
        const link = within(screen.getByTestId("deposit-12")).getByRole("link", { name: "ამონაწერი" });
        expect(link.getAttribute("href")).toMatch(
            /^\/chargesAndPayments\?academicYearId=10&studentContractId=12&dateFrom=\d{4}-\d{2}-01&dateTo=2026-10-06$/
        );

        fireEvent.click(link);
        expect(await screen.findByText("statement page")).toBeInTheDocument();
    });

    // the form footer of Access
    it("shows the totals of the shown rows", async () => {
        serve();
        renderPage();

        expect(await screen.findByTestId("totalBalance")).toHaveTextContent("-74.50");
        expect(screen.getByTestId("totalFourWeekFee")).toHaveTextContent("372.00");
    });

    it("says when there are no rows", async () => {
        serve({ rows: () => ({ status: 200, body: { totalBalance: 0, totalFourWeekFee: 0, rows: [] } }) });
        renderPage();

        expect(await screen.findByText("მონაცემები არ არის")).toBeInTheDocument();
        expect(screen.queryByTestId("totalBalance")).not.toBeInTheDocument();
    });

    it.each([
        ["ფილტრი", "filter"],
        ["დარეკვის ფილტრი", "call"],
    ])("applies %s", async (caption, mode) => {
        const calls = serve();
        renderPage();

        await screen.findByTestId("deposit-10");
        fireEvent.click(screen.getByRole("button", { name: caption }));

        await waitFor(() => expect(lastRowsParams(calls).filter).toBe(mode));
        expect(location()).toContain(`filter=${mode}`);
        expect(screen.getByRole("button", { name: caption })).toHaveClass("btn-primary");
    });

    it("shows the other filter buttons as not pressed", async () => {
        serve();
        renderPage("/deposits?academicYearId=&maximum=0&dateTo=2026-10-06&filter=filter");

        await screen.findByTestId("deposit-10");
        expect(screen.getByRole("button", { name: "ფილტრი" })).toHaveClass("btn-primary");
        expect(screen.getByRole("button", { name: "დარეკვის ფილტრი" })).toHaveClass("btn-outline-secondary");
        expect(screen.getByRole("button", { name: "ფილტრის მოხსნა" })).toHaveClass("btn-outline-secondary");
    });

    it("removes the filter", async () => {
        const calls = serve();
        renderPage("/deposits?academicYearId=&maximum=0&dateTo=2026-10-06&filter=call");

        await screen.findByTestId("deposit-10");
        expect(lastRowsParams(calls).filter).toBe("call");
        fireEvent.click(screen.getByRole("button", { name: "ფილტრის მოხსნა" }));

        await waitFor(() => expect(lastRowsParams(calls).filter).toBeUndefined());
        expect(screen.getByRole("button", { name: "ფილტრის მოხსნა" })).not.toHaveClass("btn-primary");
        expect(screen.getByRole("button", { name: "დარეკვის ფილტრი" })).not.toHaveClass("btn-primary");
    });

    // while the rows of a new filter load, the old ones are not shown as if they were the answer
    it("hides the old rows while the new ones load", async () => {
        let answered = 0;
        serve({
            rows: () => (answered++ === 0 ? { status: 200, body: deposits } : new Promise<FetchReply>(() => {})),
        });
        renderPage();

        await screen.findByTestId("deposit-10");
        expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("მაქსიმუმი"), { target: { value: "-10" } });

        expect(await screen.findByText(loadingText)).toBeInTheDocument();
        expect(screen.queryByTestId("deposit-10")).not.toBeInTheDocument();
        expect(screen.queryByTestId("totalBalance")).not.toBeInTheDocument();
    });

    // the filter replaces the address: going back leaves the page instead of stepping through the filters
    it("keeps no history of the filter changes", async () => {
        serve();
        const store = createBalancesStore();
        renderBalancesOnRoute(<Deposits />, store, "/deposits", "/payments", "/deposits");

        await screen.findByTestId("deposit-10");
        fireEvent.click(screen.getByRole("button", { name: "ფილტრი" }));
        await waitFor(() => expect(location()).toContain("filter=filter"));
        fireEvent.click(screen.getByRole("button", { name: "test back" }));

        expect(location()).toBe("/payments");
    });

    // the form only holds the filter: submitting it must not reload the page
    it("does not submit the filter form", async () => {
        serve();
        renderPage();

        await screen.findByTestId("deposit-10");
        const form = screen.getByLabelText("მაქსიმუმი").closest("form")!;
        const submit = createEvent.submit(form);
        fireEvent(form, submit);

        expect(submit.defaultPrevented).toBe(true);
    });

    it("loads every year or another year", async () => {
        const calls = serve();
        renderPage();

        await screen.findByTestId("deposit-10");
        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "all" } });
        await waitFor(() => expect(lastRowsParams(calls).academicYearId).toBeUndefined());
        expect(screen.getByLabelText("სასწავლო წელი")).toHaveValue("all");

        fireEvent.change(screen.getByLabelText("სასწავლო წელი"), { target: { value: "10" } });
        await waitFor(() => expect(lastRowsParams(calls).academicYearId).toBe("10"));
    });

    it("changes the maximum and the date", async () => {
        const calls = serve();
        renderPage();

        await screen.findByTestId("deposit-10");
        fireEvent.change(screen.getByLabelText("მაქსიმუმი"), { target: { value: "-50.5" } });
        await waitFor(() => expect(lastRowsParams(calls).maximum).toBe("-50.5"));

        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "2027-06-30" } });
        await waitFor(() => expect(lastRowsParams(calls).dateTo).toBe("2027-06-30"));
        expect(location()).toContain("dateTo=2027-06-30");
    });

    // without a date there is nothing to count until
    it("keeps the date when it is cleared", async () => {
        serve();
        renderPage("/deposits?academicYearId=&maximum=0&dateTo=2026-10-06&filter=");

        await screen.findByTestId("deposit-10");
        fireEvent.change(screen.getByLabelText("თარიღამდე"), { target: { value: "" } });

        expect(screen.getByLabelText("თარიღამდე")).toHaveValue("2026-10-06");
        expect(location()).toContain("dateTo=2026-10-06");
    });

    // Access hid the button; here it is for the special right of recounting every group
    it("offers the full recount only with the special right", async () => {
        serve();
        renderPage("/deposits", "withRight", ["CheckPayments"]);

        await screen.findByTestId("deposit-10");
        expect(screen.queryByRole("button", { name: "სრული გადაანგარიშება" })).not.toBeInTheDocument();
    });

    it("recounts everything with the full recount and loads the rows again", async () => {
        let finishFullRecount: (reply: FetchReply) => void = () => {};
        const calls = serve({ fullRecount: () => new Promise<FetchReply>((resolve) => (finishFullRecount = resolve)) });
        renderPage("/deposits", "withRight", ["RecountAllGroupsLessons"]);

        await screen.findByTestId("deposit-10");
        const button = screen.getByRole("button", { name: "სრული გადაანგარიშება" });
        expect(button.querySelector(".spinner-border")).toBeNull();
        fireEvent.click(button);

        await waitFor(() => expect(button).toBeDisabled());
        expect(button.querySelector(".spinner-border")).not.toBeNull();
        expect(calls.filter((c) => c.method === "POST").map((c) => c.url.split("/api/v1")[1])).toEqual([
            "/deposits/recount",
            "/deposits/fullrecount",
        ]);

        act(() => finishFullRecount({ status: 200, body: { ...recountResult, groupsCount: 51 } }));

        await waitFor(() => expect(screen.getByTestId("recountSummary")).toHaveTextContent("ჯგუფები 51"));
        await waitFor(() => expect(rowsRequests(calls)).toHaveLength(2));
        expect(button).not.toBeDisabled();
    });

    it("says so without the menu right and loads or recounts nothing", async () => {
        const calls = serve();
        const store = renderPage("/deposits", "withoutRight");

        expect(await screen.findByText("დეპოზიტების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
        expect(Object.keys(store.getState().depositsApi.queries)).toHaveLength(0);
        expect(Object.keys(store.getState().depositsApi.mutations)).toHaveLength(0);
    });

    it("waits while the menu is loading", () => {
        const calls = serve();
        renderPage("/deposits", "loading");

        expect(screen.getByText(loadingText)).toBeInTheDocument();
        expect(screen.queryByLabelText("მაქსიმუმი")).not.toBeInTheDocument();
        expect(screen.queryByText("დეპოზიტების ნახვის უფლება არ გაქვთ")).not.toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("waits for the lookups without showing a load problem", async () => {
        const calls = serve({ lookups: () => new Promise<FetchReply>(() => {}) });
        renderPage();

        await waitFor(() => expect(calls.some((c) => c.url.includes("/formlookups"))).toBe(true));
        expect(screen.getByText(loadingText)).toBeInTheDocument();
        expect(screen.queryByText("ჩატვირთვის პრობლემა")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("მაქსიმუმი")).not.toBeInTheDocument();
    });

    it("shows the load problem", async () => {
        serve({ lookups: () => ({ status: 500, body: { title: "Boom", detail: "boom", status: 500 } }) });
        renderPage();

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
