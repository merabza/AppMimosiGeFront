//SalaryEdit.test.tsx

import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setAlertApiMutationError } from "../appcarcass/redux/slices/alertSlice";
import { type FetchCall, type FetchReply } from "../testUtils/testStore";
import type { MenuState } from "../testUtils/studentContractsTestStore";
import {
    captureDownloads,
    createSalaryStore,
    mockFetchFiles,
    renderSalaryOnRoute,
    salaryHeaderData,
    salaryLookups,
    salaryPart,
    type FileReply,
} from "../testUtils/salaryTestStore";
import type { ISalaryHeader } from "../redux/types/salaryTypes";
import { newSalaryHeaderForm } from "./salaryForm";
import SalaryEdit from "./SalaryEdit";

afterEach(() => {
    vi.restoreAllMocks();
});

type ChangeReply = (call: FetchCall) => FetchReply | Promise<FetchReply>;

const json = { "Content-Type": "application/json" };

//GET-ები JSON-ით (ცნობარები, უწყისი, ფაილი), ცვლილებები change-ით
function serve(header: ISalaryHeader = salaryHeaderData(), change: ChangeReply = () => ({ status: 200, body: 9 })) {
    return mockFetchFiles(async (call) => {
        if (call.url.includes("/transferfile")) return { status: 200, text: "DOCNUM" };
        if (call.method === "GET") {
            const body = call.url.endsWith("/formlookups") ? salaryLookups : header;
            return { status: 200, text: JSON.stringify(body), headers: json };
        }
        const reply = await change(call);
        return {
            status: reply.status,
            text: reply.body === undefined ? "" : JSON.stringify(reply.body),
            headers: json,
        };
    });
}

function renderEditor(url: string, menu: MenuState = "withRight") {
    const store = createSalaryStore(menu);
    renderSalaryOnRoute(
        <SalaryEdit />,
        store,
        url.startsWith("/salaryEdit/") ? "/salaryEdit/:shId" : "/salaryEdit",
        "/salary",
        url
    );
    return store;
}

const changes = (calls: FetchCall[]) =>
    calls.filter((c) => c.method !== "GET").map((c) => [c.method, c.url.split("/api/v1")[1], c.body]);
const location = () => screen.getByTestId("location").textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const confirm = async () => fireEvent.click(await screen.findByRole("button", { name: "დიახ" }));
const tableRows = (index: number) =>
    within(screen.getAllByRole("table")[index])
        .getAllByRole("row")
        .map((r) => Array.from(r.querySelectorAll("th,td")).map((c) => c.textContent));

describe("SalaryEdit", () => {
    describe("a new header", () => {
        it("starts on the fifth of the current month and has no sections", async () => {
            serve();
            renderEditor("/salaryEdit");

            expect(await screen.findByText("ახალი უწყისი")).toBeInTheDocument();
            expect(field("დარიცხვის თარიღი")).toHaveValue(newSalaryHeaderForm().shChargeDate);
            expect(field("გადარიცხვის თარიღი")).toHaveValue(newSalaryHeaderForm().shTransferDate);
            expect(screen.queryByRole("button", { name: /წაშლა/ })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /გამოთვლა/ })).not.toBeInTheDocument();
            expect(screen.queryByText("სტრიქონები")).not.toBeInTheDocument();
        });

        it("creates the header and opens it in place of the new form", async () => {
            const calls = serve(salaryHeaderData(), () => ({ status: 200, body: 7 }));
            renderEditor("/salaryEdit");
            await screen.findByText("ახალი უწყისი");

            fireEvent.change(field("დარიცხვის თარიღი"), { target: { value: "2026-12-05" } });
            fireEvent.change(field("გადარიცხვის თარიღი"), { target: { value: "2026-12-04" } });
            fireEvent.click(button(/შექმნა/));

            await waitFor(() => expect(location()).toBe("/salaryEdit/7"));
            expect(changes(calls)).toEqual([
                ["POST", "/salary", { shChargeDate: "2026-12-05", shTransferDate: "2026-12-04" }],
            ]);
            //ისტორიაში ახალი უწყისის ფორმა აღარ არის: "უკან" სიაზე ბრუნდება
            fireEvent.click(screen.getByRole("button", { name: "test back" }));
            await waitFor(() => expect(location()).toBe("/salary"));
        });

        it("shows a server error and stays", async () => {
            serve(salaryHeaderData(), () => ({
                status: 400,
                body: { title: "ChargeDateIsRequired", detail: "no date", status: 400 },
            }));
            renderEditor("/salaryEdit");
            await screen.findByText("ახალი უწყისი");

            fireEvent.click(button(/შექმნა/));

            expect(await screen.findByText(/no date|ChargeDateIsRequired/)).toBeInTheDocument();
            expect(location()).toBe("/salaryEdit");
        });
    });

    describe("an existing header", () => {
        it("shows the dates, the parts, the lines with totals and the details", async () => {
            serve();
            renderEditor("/salaryEdit/2");

            expect(await screen.findByText("ხელფასის უწყისი 05.10.2026")).toBeInTheDocument();
            expect(field("დარიცხვის თარიღი")).toHaveValue("2026-10-05");
            expect(field("გადარიცხვის თარიღი")).toHaveValue("2026-10-04");
            expect(tableRows(0)).toEqual([
                ["თანამშრომელი", "ტიპი", "თანხა", ""],
                ["Alpha Ann / T3.01", "ხელფასი ჩატარებული გაკვეთილების მიხედვით", "99.50", "გამოთვლით"],
                ["Beta Bob / T3.05", "დანამატი", "800.00", ""],
            ]);
            expect(tableRows(1).slice(1, 3)).toEqual([
                ["Alpha Ann / T3.01", "09.2026", "100.00", "125.00", "2.50", "122.50", "24.50", "0.00", "10.00", "5.00", "88.00"],
                ["Beta Bob / T3.05", "09.2026", "800.00", "1000.00", "0.00", "1000.00", "200.00", "0.00", "0.00", "0.00", "800.00"],
            ]);
            expect(Array.from(screen.getByTestId("salary-totals").children).map((c) => c.textContent)).toEqual([
                "ჯამი", "900.00", "1125.00", "2.50", "1122.50", "224.50", "0.00", "10.00", "5.00", "888.00",
            ]);
            expect(screen.getByTestId("salary-total")).toHaveTextContent("1117.50");
            expect(screen.queryByText("მდგენელები არ არის")).not.toBeInTheDocument();
            expect(screen.queryByText("სტრიქონები არ არის: უწყისი ჯერ არ გამოთვლილა")).not.toBeInTheDocument();
            expect(screen.queryByText("დეტალები არ არის")).not.toBeInTheDocument();
            expect(tableRows(2)).toEqual([
                ["თანამშრომელი", "ჯგუფი", "საათები", "თანხა", "ერთი საათის ღირებულება"],
                ["Alpha Ann / T3.01", "G-100", "12.5", "99.50", "7.96"],
            ]);
        });

        it("says when nothing is calculated yet", async () => {
            serve(salaryHeaderData({ parts: [], lines: [], details: [] }));
            renderEditor("/salaryEdit/2");

            expect(await screen.findByText("მდგენელები არ არის")).toBeInTheDocument();
            expect(screen.getByText("სტრიქონები არ არის: უწყისი ჯერ არ გამოთვლილა")).toBeInTheDocument();
            expect(screen.getByText("დეტალები არ არის")).toBeInTheDocument();
        });

        it("saves changed dates; count and file wait for the save", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");
            expect(button(/შენახვა/)).toBeDisabled();
            expect(button(/გამოთვლა/)).toBeEnabled();

            fireEvent.change(field("გადარიცხვის თარიღი"), { target: { value: "2026-10-06" } });

            expect(button(/გამოთვლა/)).toBeDisabled();
            expect(button(/გადარიცხვის ფაილის მომზადება/)).toBeDisabled();
            expect(screen.getByText("ჯერ თარიღები შეინახეთ")).toBeInTheDocument();
            fireEvent.click(button(/შენახვა/));
            await waitFor(() =>
                expect(changes(calls)).toEqual([
                    ["PUT", "/salary/2", { shChargeDate: "2026-10-05", shTransferDate: "2026-10-06" }],
                ])
            );
            expect(location()).toBe("/salaryEdit/2");
        });

        it("deletes the header after confirmation and returns to the list", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(screen.getByRole("button", { name: "წაშლა" }));
            expect(await screen.findByText(/05.10.2026-ის უწყისი\?/)).toBeInTheDocument();
            await confirm();

            await waitFor(() => expect(location()).toBe("/salary"));
            expect(changes(calls)).toEqual([["DELETE", "/salary/2", undefined]]);
        });

        it("shows why a header with data is not deleted", async () => {
            serve(salaryHeaderData(), () => ({
                status: 409,
                body: { title: "SalaryHeaderHasData", detail: "has parts", status: 409 },
            }));
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(screen.getByRole("button", { name: "წაშლა" }));
            await confirm();

            expect(await screen.findByText(/has parts|SalaryHeaderHasData/)).toBeInTheDocument();
            expect(location()).toBe("/salaryEdit/2");
        });

        it("closes to the list", async () => {
            serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/დახურვა/));

            expect(location()).toBe("/salary");
        });
    });

    describe("count", () => {
        it("asks before replacing the lines and shows the result", async () => {
            const calls = serve(salaryHeaderData(), () => ({
                status: 200,
                body: { lessonPartsCount: 6, linesCount: 7, detailsCount: 15 },
            }));
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/გამოთვლა/));
            expect(
                await screen.findByText(
                    "უწყისის სტრიქონები და ჩატარებული გაკვეთილების ხელფასი წაიშლება და თავიდან დაითვლება " +
                        "(ხელით შეტანილი მდგენელები რჩება). გავაგრძელო?"
                )
            ).toBeInTheDocument();
            await confirm();

            expect(await screen.findByText(/გამოითვალა: 7 სტრიქონი/)).toHaveTextContent(
                "გამოითვალა: 7 სტრიქონი, ჩატარებული გაკვეთილების 6 მდგენელი, 15 დეტალი"
            );
            expect(changes(calls)).toEqual([["POST", "/salary/2/count", undefined]]);
        });

        it("asks plainly when nothing is calculated yet", async () => {
            serve(salaryHeaderData({ lines: [] }));
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/გამოთვლა/));

            expect(await screen.findByText("უწყისი გამოითვლება. გავაგრძელო?")).toBeInTheDocument();
        });

        it("does nothing when the question is declined", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/გამოთვლა/));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));

            await waitFor(() => expect(screen.queryByRole("button", { name: "დიახ" })).not.toBeInTheDocument());
            expect(changes(calls)).toEqual([]);
        });
    });

    it("downloads the transfer file named by the transfer date", async () => {
        const saved = captureDownloads();
        const calls = serve();
        renderEditor("/salaryEdit/2");
        await screen.findByText("ხელფასის უწყისი 05.10.2026");

        fireEvent.click(button(/გადარიცხვის ფაილის მომზადება/));

        await waitFor(() => expect(saved.map((s) => s.fileName)).toEqual(["salary_2026_10_4.csv"]));
        expect(calls.some((c) => c.url.endsWith("/salary/2/transferfile"))).toBe(true);
    });

    describe("parts", () => {
        it("adds a part; the calculated type is not offered", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/მდგენელის დამატება/));
            const types = within(field("ტიპი")).getAllByRole("option").map((o) => o.textContent);
            expect(types).toEqual(["-- აირჩიეთ --", "დანამატი", "გამოქვითვა", "დივიდენდი"]);
            fireEvent.change(field("თანამშრომელი"), { target: { value: "1" } });
            fireEvent.change(field("ტიპი"), { target: { value: "3" } });
            fireEvent.change(field("თანხა"), { target: { value: "-12.5" } });
            fireEvent.click(within(screen.getByRole("form", { name: "მდგენელი" })).getByRole("button", { name: /შენახვა/ }));

            await waitFor(() =>
                expect(changes(calls)).toEqual([
                    ["POST", "/salary/2/parts", { teacherContractId: 1, salaryPartTypeId: 3, spAmount: -12.5 }],
                ])
            );
            await waitFor(() => expect(screen.queryByLabelText("თანხა")).not.toBeInTheDocument());
        });

        it("a deduction must be positive", async () => {
            serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/მდგენელის დამატება/));
            const form = screen.getByRole("form", { name: "მდგენელი" });
            fireEvent.change(field("ტიპი"), { target: { value: "4" } });
            expect(form.querySelector(".form-text")).toHaveTextContent("გამოქვითვა დადებითი თანხით იწერება");
            fireEvent.change(field("თანხა"), { target: { value: "-5" } });

            expect(field("თანხა")).toHaveClass("is-invalid");
            expect(within(form).getByRole("button", { name: /შენახვა/ })).toBeDisabled();
            fireEvent.change(field("თანხა"), { target: { value: "5" } });
            expect(field("თანხა")).not.toHaveClass("is-invalid");
            expect(within(form).getByRole("button", { name: /შენახვა/ })).toBeEnabled();
        });

        it("edits a manual part", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(screen.getByTitle("მდგენელის შეცვლა"));
            expect(field("თანამშრომელი")).toHaveValue("5");
            expect(field("ტიპი")).toHaveValue("3");
            expect(field("თანხა")).toHaveValue(800);
            fireEvent.change(field("თანხა"), { target: { value: "850" } });
            fireEvent.click(within(screen.getByRole("form", { name: "მდგენელი" })).getByRole("button", { name: /შენახვა/ }));

            await waitFor(() =>
                expect(changes(calls)).toEqual([
                    ["PUT", "/salary/parts/21", { teacherContractId: 5, salaryPartTypeId: 3, spAmount: 850 }],
                ])
            );
        });

        it("cancels the editing", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(button(/მდგენელის დამატება/));
            fireEvent.click(button(/გაუქმება/));

            expect(screen.queryByLabelText("თანხა")).not.toBeInTheDocument();
            expect(changes(calls)).toEqual([]);
        });

        it("deletes a manual part after confirmation", async () => {
            const calls = serve();
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(screen.getByTitle("მდგენელის წაშლა"));
            expect(await screen.findByText(/Beta Bob \/ T3.05, დანამატი, 800.00\?/)).toBeInTheDocument();
            await confirm();

            await waitFor(() => expect(changes(calls)).toEqual([["DELETE", "/salary/parts/21", undefined]]));
        });

        it("shows a server error of a part", async () => {
            serve(salaryHeaderData(), () => ({
                status: 409,
                body: { title: "PartIsCalculated", detail: "calculated part", status: 409 },
            }));
            renderEditor("/salaryEdit/2");
            await screen.findByText("ხელფასის უწყისი 05.10.2026");

            fireEvent.click(screen.getByTitle("მდგენელის შეცვლა"));
            fireEvent.click(within(screen.getByRole("form", { name: "მდგენელი" })).getByRole("button", { name: /შენახვა/ }));

            expect(await screen.findByText(/calculated part|PartIsCalculated/)).toBeInTheDocument();
            expect(field("თანხა")).toBeInTheDocument();
        });
    });

    describe("while working", () => {
        const title = "ხელფასის უწყისი 05.10.2026";
        const loading = "მიმდინარეობს ჩატვირთვა...";
        const refused: FetchReply = {
            status: 409,
            body: { title: "SalaryHeaderHasData", detail: "refused", status: 409 },
        };
        const fileRefused: FileReply = {
            status: 404,
            text: JSON.stringify({ title: "SalaryHeaderNotFound", detail: "refused", status: 404 }),
            headers: json,
        };
        const counted: FetchReply = { status: 200, body: { lessonPartsCount: 6, linesCount: 7, detailsCount: 15 } };
        const headerThree = salaryHeaderData({
            shId: 3,
            shChargeDate: "2026-12-05T00:00:00",
            shTransferDate: "2026-12-04T00:00:00",
            lines: [],
        });
        const spinner = (element: HTMLElement) => element.querySelector(".spinner-border");
        const fileButton = () => button(/გადარიცხვის ფაილის მომზადება/);
        const deleteButton = () => screen.getByRole("button", { name: "წაშლა" }) as HTMLButtonElement;

        function never<T>() {
            return new Promise<T>(() => undefined);
        }

        // the changes and the file downloads reply in turn; a missing reply never arrives
        function serveInTurn(changeReplies: FetchReply[], fileReplies: FileReply[] = []) {
            let nextChange = 0;
            let nextFile = 0;
            return mockFetchFiles((call) => {
                if (call.url.includes("/transferfile"))
                    return nextFile < fileReplies.length ? fileReplies[nextFile++] : never<FileReply>();
                if (call.method === "GET") {
                    const body = call.url.endsWith("/formlookups") ? salaryLookups : salaryHeaderData();
                    return { status: 200, text: JSON.stringify(body), headers: json };
                }
                if (nextChange >= changeReplies.length) return never<FileReply>();
                const reply = changeReplies[nextChange++];
                return {
                    status: reply.status,
                    text: reply.body === undefined ? "" : JSON.stringify(reply.body),
                    headers: json,
                };
            });
        }

        async function openHeader() {
            renderEditor("/salaryEdit/2");
            await screen.findByText(title);
        }

        // two headers in one editor: the second one is answered by hand, so the loading in between can be seen
        function renderTwoHeaders(three: Promise<FileReply> | FileReply, change: () => FetchReply = () => counted) {
            mockFetchFiles((call) => {
                if (call.method !== "GET") {
                    const reply = change();
                    return { status: reply.status, text: JSON.stringify(reply.body), headers: json };
                }
                if (call.url.endsWith("/formlookups"))
                    return { status: 200, text: JSON.stringify(salaryLookups), headers: json };
                if (call.url.endsWith("/salary/3")) return three;
                return { status: 200, text: JSON.stringify(salaryHeaderData()), headers: json };
            });
            render(
                <Provider store={createSalaryStore()}>
                    <MemoryRouter initialEntries={["/salaryEdit/2"]}>
                        <Routes>
                            <Route path="/salaryEdit/:shId" element={<SalaryEdit />} />
                        </Routes>
                        <Link to="/salaryEdit/3">next</Link>
                    </MemoryRouter>
                </Provider>
            );
        }

        const answeredThree: FileReply = { status: 200, text: JSON.stringify(headerThree), headers: json };

        // the form is filled once per header, but another header opened in the same editor is loaded
        it("loads another header opened in the same editor", async () => {
            let answerThree: (reply: FileReply) => void = () => undefined;
            renderTwoHeaders(new Promise<FileReply>((resolve) => (answerThree = resolve)));
            await screen.findByText(title);
            fireEvent.change(field("დარიცხვის თარიღი"), { target: { value: "2026-10-06" } });

            fireEvent.click(screen.getByText("next"));

            expect(await screen.findByText(loading)).toBeInTheDocument();
            answerThree(answeredThree);
            expect(await screen.findByText("ხელფასის უწყისი 05.12.2026")).toBeInTheDocument();
            expect(field("დარიცხვის თარიღი")).toHaveValue("2026-12-05");
            expect(field("გადარიცხვის თარიღი")).toHaveValue("2026-12-04");
        });

        it("drops the count result when another header is opened", async () => {
            renderTwoHeaders(answeredThree);
            await screen.findByText(title);
            fireEvent.click(button(/გამოთვლა/));
            await confirm();
            await screen.findByText(/გამოითვალა:/);

            fireEvent.click(screen.getByText("next"));

            await screen.findByText("ხელფასის უწყისი 05.12.2026");
            expect(screen.queryByText(/გამოითვალა:/)).not.toBeInTheDocument();
        });

        it("clears the change errors when another header is opened", async () => {
            renderTwoHeaders(answeredThree, () => refused);
            await screen.findByText(title);
            fireEvent.change(field("გადარიცხვის თარიღი"), { target: { value: "2026-10-06" } });
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(screen.getByText("next"));

            await screen.findByText("ხელფასის უწყისი 05.12.2026");
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("fills the form only when its header has arrived", async () => {
            let answer: (reply: FileReply) => void = () => undefined;
            mockFetchFiles((call) =>
                call.url.endsWith("/formlookups")
                    ? { status: 200, text: JSON.stringify(salaryLookups), headers: json }
                    : new Promise<FileReply>((resolve) => (answer = resolve))
            );
            renderEditor("/salaryEdit/2");
            expect(await screen.findByText(loading)).toBeInTheDocument();

            answer({ status: 200, text: JSON.stringify(salaryHeaderData()), headers: json });

            expect(await screen.findByText(title)).toBeInTheDocument();
            expect(field("დარიცხვის თარიღი")).toHaveValue("2026-10-05");
        });

        // a part change reloads the header; the dates typed meanwhile stay
        it("keeps the typed dates when the header reloads", async () => {
            let headerLoads = 0;
            mockFetchFiles((call) => {
                if (call.method !== "GET") return { status: 200, text: "9", headers: json };
                if (call.url.endsWith("/formlookups"))
                    return { status: 200, text: JSON.stringify(salaryLookups), headers: json };
                headerLoads++;
                const header =
                    headerLoads === 1
                        ? salaryHeaderData()
                        : salaryHeaderData({ parts: [...salaryHeaderData().parts, salaryPart({ spId: 22 })] });
                return { status: 200, text: JSON.stringify(header), headers: json };
            });
            renderEditor("/salaryEdit/2");
            await screen.findByText(title);
            fireEvent.change(field("დარიცხვის თარიღი"), { target: { value: "2026-10-06" } });

            fireEvent.click(button(/მდგენელის დამატება/));
            fireEvent.change(field("თანამშრომელი"), { target: { value: "1" } });
            fireEvent.change(field("ტიპი"), { target: { value: "3" } });
            fireEvent.change(field("თანხა"), { target: { value: "5" } });
            fireEvent.click(
                within(screen.getByRole("form", { name: "მდგენელი" })).getByRole("button", { name: /შენახვა/ })
            );

            await waitFor(() => expect(tableRows(0)).toHaveLength(4));
            expect(field("დარიცხვის თარიღი")).toHaveValue("2026-10-06");
        });

        it("counts a changed charge date as unsaved", async () => {
            serve();
            await openHeader();

            fireEvent.change(field("დარიცხვის თარიღი"), { target: { value: "2026-10-06" } });

            expect(button(/შენახვა/)).toBeEnabled();
            expect(button(/გამოთვლა/)).toBeDisabled();
            expect(screen.getByText("ჯერ თარიღები შეინახეთ")).toBeInTheDocument();
        });

        // the page sends the header itself; the browser must not submit the form
        it("keeps the browser from submitting the form", async () => {
            serveInTurn([]);
            await openHeader();
            const form = button(/შენახვა/).closest("form")!;

            const submit = createEvent.submit(form);
            fireEvent(form, submit);

            expect(submit.defaultPrevented).toBe(true);
        });

        it("clears the old error when saving again", async () => {
            serveInTurn([refused]);
            await openHeader();
            fireEvent.change(field("გადარიცხვის თარიღი"), { target: { value: "2026-10-06" } });
            fireEvent.click(button(/შენახვა/));
            await screen.findByText("refused");

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("clears the old error when deleting again", async () => {
            serveInTurn([refused]);
            await openHeader();
            fireEvent.click(deleteButton());
            await confirm();
            await screen.findByText("refused");

            fireEvent.click(deleteButton());
            await confirm();

            await waitFor(() => expect(deleteButton()).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("clears the old error when counting again", async () => {
            serveInTurn([refused]);
            await openHeader();
            fireEvent.click(button(/გამოთვლა/));
            await confirm();
            await screen.findByText("refused");

            fireEvent.click(button(/გამოთვლა/));
            await confirm();

            await waitFor(() => expect(button(/გამოთვლა/)).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("drops the old count result when counting again", async () => {
            serveInTurn([counted]);
            await openHeader();
            fireEvent.click(button(/გამოთვლა/));
            await confirm();
            await screen.findByText(/გამოითვალა:/);

            fireEvent.click(button(/გამოთვლა/));
            await confirm();

            await waitFor(() => expect(button(/გამოთვლა/)).toBeDisabled());
            expect(screen.queryByText(/გამოითვალა:/)).not.toBeInTheDocument();
        });

        it("clears the old error when downloading again", async () => {
            serveInTurn([], [fileRefused]);
            await openHeader();
            fireEvent.click(fileButton());
            await screen.findByText("refused");

            fireEvent.click(fileButton());

            await waitFor(() => expect(fileButton()).toBeDisabled());
            expect(screen.queryByText("refused")).not.toBeInTheDocument();
        });

        it("asks again after the deletion was declined", async () => {
            serveInTurn([]);
            await openHeader();
            fireEvent.click(deleteButton());
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));
            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());

            fireEvent.click(deleteButton());

            expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
        });

        it("asks again after a refused deletion", async () => {
            serveInTurn([refused]);
            await openHeader();
            fireEvent.click(deleteButton());
            await confirm();
            await screen.findByText("refused");

            fireEvent.click(deleteButton());

            expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
        });

        it("asks again after the count was declined", async () => {
            serveInTurn([]);
            await openHeader();
            fireEvent.click(button(/გამოთვლა/));
            fireEvent.click(await screen.findByRole("button", { name: "არა" }));
            await waitFor(() => expect(screen.queryByRole("button", { name: "არა" })).not.toBeInTheDocument());

            fireEvent.click(button(/გამოთვლა/));

            expect(await screen.findByRole("button", { name: "არა" })).toBeInTheDocument();
        });

        it("asks again after a count", async () => {
            serveInTurn([counted]);
            await openHeader();
            fireEvent.click(button(/გამოთვლა/));
            await confirm();
            await screen.findByText(/გამოითვალა:/);

            fireEvent.click(button(/გამოთვლა/));

            expect(await screen.findByRole("button", { name: "დიახ" })).toBeInTheDocument();
        });

        it("hides the count result when it is closed", async () => {
            serveInTurn([counted]);
            await openHeader();
            fireEvent.click(button(/გამოთვლა/));
            await confirm();
            const result = (await screen.findByText(/გამოითვალა:/)).closest("[role=alert]") as HTMLElement;

            fireEvent.click(within(result).getByRole("button", { name: "Close alert" }));

            await waitFor(() => expect(screen.queryByText(/გამოითვალა:/)).not.toBeInTheDocument());
        });

        it("shows the spinner only on the save button while saving", async () => {
            serveInTurn([]);
            await openHeader();
            fireEvent.change(field("გადარიცხვის თარიღი"), { target: { value: "2026-10-06" } });
            expect(spinner(button(/შენახვა/))).toBeNull();

            fireEvent.click(button(/შენახვა/));

            await waitFor(() => expect(button(/შენახვა/)).toBeDisabled());
            expect(spinner(button(/შენახვა/))).not.toBeNull();
            expect(spinner(deleteButton())).toBeNull();
            expect(deleteButton()).toBeEnabled();
        });

        it("shows the spinner while a new header is created", async () => {
            serveInTurn([]);
            renderEditor("/salaryEdit");
            await screen.findByText("ახალი უწყისი");

            fireEvent.click(button(/შექმნა/));

            await waitFor(() => expect(button(/შექმნა/)).toBeDisabled());
            expect(spinner(button(/შექმნა/))).not.toBeNull();
        });

        it("shows the spinner only on the delete button while deleting", async () => {
            serveInTurn([]);
            await openHeader();
            expect(spinner(deleteButton())).toBeNull();

            fireEvent.click(deleteButton());
            await confirm();

            await waitFor(() => expect(deleteButton()).toBeDisabled());
            expect(spinner(deleteButton())).not.toBeNull();
            expect(spinner(button(/გამოთვლა/))).toBeNull();
            expect(spinner(fileButton())).toBeNull();
        });

        it("shows the spinner only on the count button while counting", async () => {
            serveInTurn([]);
            await openHeader();
            expect(spinner(button(/გამოთვლა/))).toBeNull();

            fireEvent.click(button(/გამოთვლა/));
            await confirm();

            await waitFor(() => expect(button(/გამოთვლა/)).toBeDisabled());
            expect(spinner(button(/გამოთვლა/))).not.toBeNull();
            expect(spinner(deleteButton())).toBeNull();
            expect(spinner(fileButton())).toBeNull();
        });

        it("shows the spinner only on the file button while downloading", async () => {
            serveInTurn([]);
            await openHeader();
            expect(spinner(fileButton())).toBeNull();

            fireEvent.click(fileButton());

            await waitFor(() => expect(fileButton()).toBeDisabled());
            expect(spinner(fileButton())).not.toBeNull();
            expect(spinner(button(/გამოთვლა/))).toBeNull();
            expect(spinner(deleteButton())).toBeNull();
        });
    });

    // an error left by another page is not shown here
    it("clears an old mutation error when it opens", async () => {
        serve();
        const store = createSalaryStore();
        store.dispatch(setAlertApiMutationError([{ errorCode: "Old", errorMessage: "old error" }]));
        renderSalaryOnRoute(<SalaryEdit />, store, "/salaryEdit/:shId", "/salaryEdit/2");

        await screen.findByText("ხელფასის უწყისი 05.10.2026");
        expect(screen.queryByText("old error")).not.toBeInTheDocument();
        expect(store.getState().alertState.alert.ApiMutation ?? []).toEqual([]);
    });

    it("does not load without the right", async () => {
        const calls = serve();
        renderEditor("/salaryEdit/2", "withoutRight");

        expect(await screen.findByText("ხელფასების ნახვის უფლება არ გაქვთ")).toBeInTheDocument();
        expect(calls).toHaveLength(0);
    });

    it("shows a load error", async () => {
        mockFetchFiles(() => ({ status: 500, text: JSON.stringify({ title: "Boom", status: 500 }), headers: json }));
        renderEditor("/salaryEdit/2");

        expect(await screen.findByText("ჩატვირთვის პრობლემა")).toBeInTheDocument();
    });
});
