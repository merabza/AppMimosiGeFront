import { describe, expect, it } from "vitest";
import {
    dateTextError,
    dateTimeTextError,
    dateTimeTextPlaceholder,
    formatDateTimeText,
    normalizeDateTime,
    parseDateText,
    parseDateTimeText,
} from "./dateText";

describe("parseDateTimeText", () => {
    it.each([
        ["24.09.2026 19:48", false, "2026-09-24T19:48"],
        ["24.9.26 9:05", false, "2026-09-24T09:05"],
        ["24092026 19:48", false, "2026-09-24T19:48"],
        ["  24.09.2026   19:48 ", false, "2026-09-24T19:48"],
        ["24 09 2026 19:48", false, "2026-09-24T19:48"],
        ["2026-09-24T19:48", false, "2026-09-24T19:48"],
        ["24.09.2026 00:00", false, "2026-09-24T00:00"],
        ["24.09.2026 23:59", false, "2026-09-24T23:59"],
        ["24.09.2026 19:48:05", true, "2026-09-24T19:48:05"],
        ["24.09.2026 19:48", true, "2026-09-24T19:48:00"],
        ["2026-09-24T19:48:59", true, "2026-09-24T19:48:59"],
    ])("reads %j (seconds %s) as %j", (text, seconds, expected) => {
        expect(parseDateTimeText(text, seconds)).toBe(expected);
    });

    it("reads an empty text as no value", () => {
        expect(parseDateTimeText(" ", false)).toBe("");
        expect(parseDateTimeText("", true)).toBe("");
    });

    it.each([
        ["24.09.2026", false],
        ["24.09.2026 19", false],
        ["24.09.2026 19:4", false],
        ["24.09.2026 24:00", false],
        ["24.09.2026 19:60", false],
        ["24.09.2026 19:48:05", false],
        ["24.09.2026 19:48:60", true],
        ["24.09.2026 19:48:5", true],
        ["31.09.2026 19:48", false],
        ["24.09.2026x19:48", false],
        ["19:48", false],
        ["T19:48", false],
        ["24.09.2026 119:48", false],
        ["24.09.2026 19:48 x", false],
    ])("rejects %j (seconds %s)", (text, seconds) => {
        expect(parseDateTimeText(text, seconds)).toBeNull();
    });
});

describe("normalizeDateTime and formatDateTimeText", () => {
    it("cuts or adds the seconds", () => {
        expect(normalizeDateTime("2026-09-24T19:48:05", false)).toBe("2026-09-24T19:48");
        expect(normalizeDateTime("2026-09-24T19:48", true)).toBe("2026-09-24T19:48:00");
        expect(normalizeDateTime("2026-09-24T19:48:05.123", true)).toBe("2026-09-24T19:48:05");
        expect(normalizeDateTime("", true)).toBe("");
    });

    it("writes the date and time the way they are typed", () => {
        expect(formatDateTimeText("2026-09-24T19:48", false)).toBe("24.09.2026 19:48");
        expect(formatDateTimeText("2026-09-24T19:48:05", false)).toBe("24.09.2026 19:48");
        expect(formatDateTimeText("2026-09-24T19:48", true)).toBe("24.09.2026 19:48:00");
        expect(formatDateTimeText("2026-09-24T19:48:05.5", true)).toBe("24.09.2026 19:48:05");
        expect(formatDateTimeText("", false)).toBe("");
    });

    it("names the format in the hint and the error", () => {
        expect(dateTimeTextPlaceholder(false)).toBe("დდ.თთ.წწწწ სთ:წთ");
        expect(dateTimeTextPlaceholder(true)).toBe("დდ.თთ.წწწწ სთ:წთ:წმ");
        expect(dateTimeTextError("24.09.2026", true)).toBe(
            "ჩაწერეთ თარიღი და დრო ფორმით დდ.თთ.წწწწ სთ:წთ:წმ"
        );
        expect(dateTimeTextError("24.09.2026 19:48", false)).toBe("");
        expect(dateTimeTextError("", false)).toBe("");
    });
});

describe("parseDateText", () => {
    it.each([
        ["16.11.2026", "2026-11-16"],
        ["16/11/2026", "2026-11-16"],
        ["16-11-2026", "2026-11-16"],
        ["16 11 2026", "2026-11-16"],
        ["1.2.2026", "2026-02-01"],
        ["16.11.26", "2026-11-16"],
        ["16112026", "2026-11-16"],
        ["2026-11-16", "2026-11-16"],
        ["  16.11.2026 ", "2026-11-16"],
        ["29.02.2028", "2028-02-29"],
        ["31.12.1900", "1900-12-31"],
    ])("reads %j as %j", (text, expected) => {
        expect(parseDateText(text)).toBe(expected);
    });

    it("reads an empty text as no date", () => {
        expect(parseDateText("")).toBe("");
        expect(parseDateText("   ")).toBe("");
    });

    it.each([
        "16",
        "16.11",
        "16.11.",
        "16.11.2",
        "16.11.202",
        "16.11.20261",
        "1611202",
        "116112026",
        "161120261",
        "29.02.2026",
        "31.04.2026",
        "00.11.2026",
        "16.13.2026",
        "16.00.2026",
        "31.12.1899",
        "16.11.2026x",
        "16,11,2026",
        "2026-13-01",
        "abc",
    ])("rejects %j", (text) => {
        expect(parseDateText(text)).toBeNull();
    });
});

describe("dateTextError", () => {
    it("accepts an empty or valid date", () => {
        expect(dateTextError("")).toBe("");
        expect(dateTextError("16.11.2026")).toBe("");
    });

    it("asks for the format when the text isn't a date", () => {
        expect(dateTextError("16.11")).toBe("ჩაწერეთ თარიღი ფორმით დდ.თთ.წწწწ");
    });

    it("checks the date against min and max inclusively", () => {
        expect(dateTextError("01.09.2026", "2026-09-01", "2026-09-30")).toBe("");
        expect(dateTextError("30.09.2026", "2026-09-01", "2026-09-30")).toBe("");
        expect(dateTextError("31.08.2026", "2026-09-01")).toBe(
            "თარიღი არ უნდა იყოს 01.09.2026-ზე ადრე"
        );
        expect(dateTextError("01.10.2026", undefined, "2026-09-30")).toBe(
            "თარიღი არ უნდა იყოს 30.09.2026-ზე გვიან"
        );
    });

    it("ignores an empty min or max and doesn't check an empty text against them", () => {
        expect(dateTextError("01.01.2000", "", "")).toBe("");
        expect(dateTextError("", "2026-09-01", "2026-09-30")).toBe("");
    });
});
