//reportsForm.test.ts

import { describe, expect, it } from "vitest";
import { periodReport, reportCatalog, reportInfo } from "../testUtils/reportsTestStore";
import type { IReportParameters } from "../redux/types/reportsTypes";
import {
    defaultParameters,
    excelFileName,
    formatCell,
    isNumericColumn,
    isPeriodInvalid,
    missingRequiredCaption,
    reportQueryString,
    reportsOfCategory,
    selectedOrFirst,
    stateFromSearchParams,
    stateToSearchParams,
    usesParameter,
} from "./reportsForm";

const now = new Date(2026, 9, 2, 15, 30);

function parameters(changes: Partial<IReportParameters> = {}): IReportParameters {
    return { startDate: "", endDate: "", teacherId: "", courseId: "", studentId: "", ...changes };
}

describe("defaultParameters", () => {
    // Access's FrmMain: from the first of the month, up to today
    it("is the first of the month and today", () => {
        expect(defaultParameters(now)).toEqual(parameters({ startDate: "2026-10-01", endDate: "2026-10-02" }));
    });
});

describe("stateFromSearchParams", () => {
    it("without parameters is the first category and report with the default dates", () => {
        expect(stateFromSearchParams(new URLSearchParams(), now)).toEqual({
            categoryKey: "",
            reportKey: "",
            parameters: parameters({ startDate: "2026-10-01", endDate: "2026-10-02" }),
        });
    });

    // an emptied date stays empty instead of returning to the default
    it("reads the category, report and every parameter", () => {
        const params = new URLSearchParams(
            "category=checks&report=rPeriod&startDate=&endDate=2026-09-30&teacherId=5&courseId=3&studentId=20"
        );
        expect(stateFromSearchParams(params, now)).toEqual({
            categoryKey: "checks",
            reportKey: "rPeriod",
            parameters: { startDate: "", endDate: "2026-09-30", teacherId: "5", courseId: "3", studentId: "20" },
        });
    });
});

describe("stateToSearchParams", () => {
    it("writes every parameter, empty ones too", () => {
        expect(
            stateToSearchParams({
                categoryKey: "schedule",
                reportKey: "r03RoomsAgenda",
                parameters: parameters({ endDate: "2026-10-02" }),
            }).toString()
        ).toBe(
            "category=schedule&report=r03RoomsAgenda&startDate=&endDate=2026-10-02&teacherId=&courseId=&studentId="
        );
    });

    it("leaves out an empty category and report", () => {
        expect(stateToSearchParams({ categoryKey: "", reportKey: "", parameters: parameters() }).toString()).toBe(
            "startDate=&endDate=&teacherId=&courseId=&studentId="
        );
    });

    it("round-trips through the search parameters", () => {
        const state = {
            categoryKey: "checks",
            reportKey: "rPeriod",
            parameters: parameters({ startDate: "2026-09-01", endDate: "2026-09-30", studentId: "20" }),
        };
        expect(stateFromSearchParams(stateToSearchParams(state), now)).toEqual(state);
    });
});

describe("reportsOfCategory", () => {
    it("lists the category's reports in the catalog's order", () => {
        expect(reportsOfCategory(reportCatalog, "checks").map((r) => r.key)).toEqual(["r06RoomOver", "rPeriod"]);
    });

    it("is empty for an unknown category", () => {
        expect(reportsOfCategory(reportCatalog, "finance")).toEqual([]);
    });

    // a report the catalog does not describe is left out
    it("skips a key without a report", () => {
        const catalog = {
            ...reportCatalog,
            categories: [{ key: "x", name: "x", reportKeys: ["r06RoomOver", "missing"] }],
        };
        expect(reportsOfCategory(catalog, "x").map((r) => r.key)).toEqual(["r06RoomOver"]);
    });
});

describe("selectedOrFirst", () => {
    it("is the selected item or, like Access, the first one", () => {
        const items = [{ key: "a" }, { key: "b" }];
        expect(selectedOrFirst(items, "b")).toBe(items[1]);
        expect(selectedOrFirst(items, "")).toBe(items[0]);
        expect(selectedOrFirst(items, "x")).toBe(items[0]);
        expect(selectedOrFirst([], "a")).toBeUndefined();
    });
});

describe("parameter checks", () => {
    it("knows the report's parameters", () => {
        expect(usesParameter(periodReport, "teacherId")).toBe(true);
        expect(usesParameter(reportInfo(), "startDate")).toBe(false);
    });

    it("names the first missing required parameter", () => {
        expect(missingRequiredCaption(reportInfo(), parameters())).toBe("თარიღისთვის");
        expect(missingRequiredCaption(periodReport, parameters({ endDate: "2026-10-02" }))).toBe("თარიღიდან");
        expect(missingRequiredCaption(periodReport, parameters({ startDate: "2026-10-01" }))).toBe("თარიღამდე");
    });

    // optional lookups may stay empty
    it("has no missing parameter when the required ones are filled", () => {
        expect(
            missingRequiredCaption(periodReport, parameters({ startDate: "2026-10-01", endDate: "2026-10-02" }))
        ).toBeNull();
    });

    it("finds a start after the end", () => {
        expect(isPeriodInvalid(periodReport, parameters({ startDate: "2026-10-03", endDate: "2026-10-02" }))).toBe(
            true
        );
        expect(isPeriodInvalid(periodReport, parameters({ startDate: "2026-10-02", endDate: "2026-10-02" }))).toBe(
            false
        );
        expect(isPeriodInvalid(periodReport, parameters({ startDate: "2026-10-03" }))).toBe(false);
        expect(isPeriodInvalid(periodReport, parameters({ endDate: "2026-10-02" }))).toBe(false);
    });

    // a report without a start date does not compare the dates
    it("ignores the start date of a report that has none", () => {
        expect(isPeriodInvalid(reportInfo(), parameters({ startDate: "2026-10-09", endDate: "2026-10-02" }))).toBe(
            false
        );
    });
});

describe("reportQueryString", () => {
    it("has only the report's filled parameters", () => {
        expect(reportQueryString(reportInfo(), parameters({ startDate: "2026-10-01", endDate: "2026-10-02" }))).toBe(
            "endDate=2026-10-02"
        );
        expect(
            reportQueryString(
                periodReport,
                parameters({ startDate: "2026-10-01", endDate: "2026-10-02", teacherId: "5", studentId: "20" })
            )
        ).toBe("startDate=2026-10-01&endDate=2026-10-02&teacherId=5&studentId=20");
        expect(reportQueryString(reportInfo({ parameters: [] }), parameters({ endDate: "2026-10-02" }))).toBe("");
    });
});

describe("excelFileName", () => {
    // the server's rule: the key and the report's dates
    it("is the key and the report's dates", () => {
        expect(excelFileName(reportInfo(), parameters({ startDate: "2026-10-01", endDate: "2026-10-02" }))).toBe(
            "r03RoomsAgenda_2026-10-02.xlsx"
        );
        expect(
            excelFileName(periodReport, parameters({ startDate: "2026-10-01", endDate: "2026-10-02", teacherId: "5" }))
        ).toBe("rPeriod_2026-10-01_2026-10-02.xlsx");
        expect(excelFileName(periodReport, parameters({ endDate: "2026-10-02" }))).toBe("rPeriod_2026-10-02.xlsx");
        expect(excelFileName(reportInfo({ parameters: [] }), parameters({ endDate: "2026-10-02" }))).toBe(
            "r03RoomsAgenda.xlsx"
        );
    });
});

describe("formatCell", () => {
    it("shows each type in its format", () => {
        expect(formatCell("15:30:00", "time")).toBe("15:30");
        expect(formatCell("15:30:00.1234567", "time")).toBe("15:30");
        expect(formatCell("09:05", "time")).toBe("09:05");
        expect(formatCell("2026-10-02T00:00:00", "date")).toBe("02.10.2026");
        expect(formatCell("2026-10-02T10:30:00", "dateTime")).toBe("02.10.2026 10:30");
        expect(formatCell(12.5, "number")).toBe("12.50");
        expect(formatCell(3, "wholeNumber")).toBe("3");
        expect(formatCell(0, "wholeNumber")).toBe("0");
        expect(formatCell("A1", "text")).toBe("A1");
        expect(formatCell(null, "time")).toBe("");
    });

    // a total's label stands in a column of another type
    it("leaves a text that does not fit the type", () => {
        expect(formatCell("სულ:", "time")).toBe("სულ:");
        expect(formatCell("სულ:", "date")).toBe("სულ:");
        expect(formatCell("სულ:", "dateTime")).toBe("სულ:");
        expect(formatCell(7, "time")).toBe("7");
        expect(formatCell("x2026-10-02", "date")).toBe("x2026-10-02");
        expect(formatCell("2026-10-2", "date")).toBe("2026-10-2");
    });

    // a time or a date in a text column is a text
    it("formats only the column's own type", () => {
        expect(formatCell("15:30:00", "text")).toBe("15:30:00");
        expect(formatCell("2026-10-02T10:30:00", "text")).toBe("2026-10-02T10:30:00");
    });

    it("keeps a text with a time inside unchanged", () => {
        expect(formatCell("a 15:30:00", "time")).toBe("a 15:30:00");
        expect(formatCell("15:30:00 b", "time")).toBe("15:30:00 b");
    });
});

describe("isNumericColumn", () => {
    it("is true for numbers only", () => {
        expect(isNumericColumn("number")).toBe(true);
        expect(isNumericColumn("wholeNumber")).toBe(true);
        expect(isNumericColumn("time")).toBe(false);
        expect(isNumericColumn("text")).toBe(false);
    });
});
