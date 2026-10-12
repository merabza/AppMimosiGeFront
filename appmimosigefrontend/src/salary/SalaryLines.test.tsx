//SalaryLines.test.tsx

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { salaryHeaderData } from "../testUtils/salaryTestStore";
import SalaryLines from "./SalaryLines";

const { lines, details } = salaryHeaderData();
const grandTotalCaption = "სულ (გადასარიცხი + საშემოსავლო + საპენსიოს 4%)";

// the lines table is the first one, the details table the second
const linesRows = () => within(screen.getAllByRole("table")[0]).getAllByRole("row");
const cellTexts = (row: HTMLElement) => Array.from(row.querySelectorAll("th,td"), (c) => c.textContent);
const firstCellText = (row: HTMLElement) => cellTexts(row)[0];

// the row's cells by the column each one starts in: a cell spanning several columns moves the next ones
function cellsByColumn(row: HTMLElement): Map<number, string> {
    const cells = new Map<number, string>();
    let column = 0;
    for (const cell of Array.from(row.querySelectorAll<HTMLTableCellElement>("th,td"))) {
        cells.set(column, cell.textContent ?? "");
        column += cell.colSpan;
    }
    return cells;
}

describe("SalaryLines", () => {
    it("shows the totals and the grand total above the column headers", () => {
        render(<SalaryLines lines={lines} details={details} />);

        expect(linesRows().map(firstCellText)).toEqual([
            "ჯამი",
            grandTotalCaption,
            "თანამშრომელი",
            "Alpha Ann / T3.01",
            "Beta Bob / T3.05",
        ]);
    });

    it("puts every total under its own column header", () => {
        render(<SalaryLines lines={lines} details={details} />);
        const [totals, grandTotal, headers] = linesRows();
        const headerOf = cellsByColumn(headers);
        const underHeaders = (row: HTMLElement) =>
            Object.fromEntries(
                Array.from(cellsByColumn(row), ([column, text]) => [headerOf.get(column) ?? `column ${column}`, text] as const)
            );

        expect(underHeaders(totals)).toEqual({
            "თანამშრომელი": "ჯამი",
            "ნამუშევარი (დამრგვალებული)": "900.00",
            "დარიცხული": "1125.00",
            "საპენსიო 2%": "2.50",
            "დარიცხულს გამოკლებული საპენსიო": "1122.50",
            "საშემოსავლო": "224.50",
            "ინდ. საშემოსავლო": "0.00",
            "გამოქვითვა": "10.00",
            "საპენსიო 4%": "5.00",
            "გადასარიცხი": "888.00",
        });
        expect(underHeaders(grandTotal)).toEqual({
            "თანამშრომელი": grandTotalCaption,
            "გადასარიცხი": "1117.50",
        });
    });

    it("shows zero totals above the headers when nothing is calculated yet", () => {
        render(<SalaryLines lines={[]} details={[]} />);
        const rows = linesRows();

        expect(rows.map(firstCellText)).toEqual([
            "ჯამი",
            grandTotalCaption,
            "თანამშრომელი",
            "სტრიქონები არ არის: უწყისი ჯერ არ გამოთვლილა",
        ]);
        expect(cellTexts(rows[0])).toEqual(["ჯამი", ...Array<string>(9).fill("0.00")]);
        expect(cellTexts(rows[1])).toEqual([grandTotalCaption, "0.00"]);
    });
});
