//ReportView.test.tsx

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { roomsReport } from "../testUtils/reportsTestStore";
import ReportView from "./ReportView";

function cellTexts(row: HTMLElement): (string | null)[] {
    return Array.from(row.querySelectorAll("th,td")).map((c) => c.textContent);
}

describe("ReportView", () => {
    it("shows the title, the parameters and the rows in the columns' formats", () => {
        render(<ReportView report={roomsReport()} />);

        expect(screen.getByRole("heading", { name: "ოთახების ცხრილი" })).toBeInTheDocument();
        expect(screen.getByText("თარიღისთვის: 02.10.2026")).toBeInTheDocument();
        const rows = within(screen.getByRole("table")).getAllByRole("row");
        expect(rows.map(cellTexts)).toEqual([
            ["ოთახი", "ჯგუფი", "1-ორ", "2-სამ"],
            ["R1", "A1", "10:00", ""],
            ["R2", "B1", "", "15:30"],
        ]);
        expect(screen.getByTestId("reportView")).toHaveClass("report-print-area");
    });

    it("joins several parameters", () => {
        render(
            <ReportView
                report={roomsReport({
                    parameters: [
                        { name: "startDate", caption: "თარიღიდან", value: "01.09.2026" },
                        { name: "endDate", caption: "თარიღამდე", value: "30.09.2026" },
                    ],
                })}
            />
        );

        expect(screen.getByText("თარიღიდან: 01.09.2026; თარიღამდე: 30.09.2026")).toBeInTheDocument();
    });

    it("has no parameter line without parameters", () => {
        render(<ReportView report={roomsReport({ parameters: [] })} />);

        expect(screen.getByTestId("reportView").querySelector("p")).toBeNull();
    });

    it("says when there are no rows", () => {
        render(<ReportView report={roomsReport({ sections: [{ header: null, rows: [], footer: null }] })} />);

        expect(screen.getByText("მონაცემები არ არის")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    // the report's totals in bold, numbers on the right
    it("shows the totals in bold and the numbers on the right", () => {
        render(
            <ReportView
                report={roomsReport({
                    columns: [
                        { name: "startTime", caption: "დრო", type: "time" },
                        { name: "weekDay1", caption: "1-ორ", type: "wholeNumber" },
                    ],
                    sections: [{ header: null, rows: [["10:00:00", 2]], footer: null }],
                    footerRows: [
                        ["დღეების ჯამები:", 2],
                        ["სულ:", 2],
                    ],
                })}
            />
        );

        const table = screen.getByRole("table");
        const footer = table.querySelector("tfoot")!;
        expect(Array.from(footer.querySelectorAll("tr")).map(cellTexts)).toEqual([
            ["დღეების ჯამები:", "2"],
            ["სულ:", "2"],
        ]);
        expect(Array.from(footer.querySelectorAll("tr")).every((r) => r.classList.contains("fw-bold"))).toBe(true);
        expect(table.querySelector("tbody td:nth-child(2)")).toHaveClass("text-end");
        expect(table.querySelector("tbody td:nth-child(1)")).not.toHaveClass("text-end");
    });

    // a grouped report: every section's header across all columns, its rows and its total
    it("shows the sections of a grouped report", () => {
        render(
            <ReportView
                report={roomsReport({
                    columns: [
                        { name: "groupCode", caption: "ჯგუფი", type: "text" },
                        { name: "hours", caption: "საათები", type: "number" },
                    ],
                    sections: [
                        { header: "მასწავლებელი: Alpha", rows: [["A1", 1.5]], footer: ["ჯამი:", 1.5] },
                        { header: "მასწავლებელი: Beta", rows: [["B1", 2]], footer: null },
                    ],
                })}
            />
        );

        const bodies = screen.getByRole("table").querySelectorAll("tbody");
        expect(bodies).toHaveLength(2);
        expect(Array.from(bodies[0].querySelectorAll("tr")).map(cellTexts)).toEqual([
            ["მასწავლებელი: Alpha"],
            ["A1", "1.50"],
            ["ჯამი:", "1.50"],
        ]);
        expect(bodies[0].querySelector("td")).toHaveAttribute("colspan", "2");
        expect(bodies[0].querySelectorAll("tr")[0]).toHaveClass("fw-bold");
        expect(bodies[0].querySelectorAll("tr")[1]).not.toHaveClass("fw-bold");
        expect(bodies[0].querySelectorAll("tr")[2]).toHaveClass("fw-bold");
        expect(Array.from(bodies[1].querySelectorAll("tr")).map(cellTexts)).toEqual([
            ["მასწავლებელი: Beta"],
            ["B1", "2.00"],
        ]);
        expect(screen.getByRole("table").querySelector("tfoot")).toBeNull();
    });

    // the table scrolls in its own box; a report of more than 20 columns (r36) is marked wide for the landscape print
    it.each([
        [20, false],
        [21, true],
    ])("marks a report of %i columns as wide: %s", (count, wide) => {
        const columns = Array.from({ length: count }, (_, index) => ({
            name: `c${index}`,
            caption: `${index}`,
            type: "number" as const,
        }));
        render(
            <ReportView
                report={roomsReport({ columns, sections: [{ header: null, rows: [[1]], footer: null }] })}
            />
        );

        const view = screen.getByTestId("reportView");
        const table = screen.getByRole("table");
        expect(view.className).toBe(wide ? "report-print-area report-print-area-wide" : "report-print-area");
        expect(table.className).toBe(
            wide
                ? "report-table report-table-wide table table-sm table-striped table-bordered"
                : "report-table table table-sm table-striped table-bordered"
        );
        expect(table.parentElement).toHaveClass("report-table-scroll");
    });

    // a row shorter than the columns leaves the missing cells empty
    it("shows a short row with empty cells", () => {
        render(<ReportView report={roomsReport({ sections: [{ header: null, rows: [["R1"]], footer: null }] })} />);

        const rows = within(screen.getByRole("table")).getAllByRole("row");
        expect(cellTexts(rows[1])).toEqual(["R1", "", "", ""]);
    });
});
