//CrmCallFields.test.tsx

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { crmCallLookups } from "../testUtils/crmCallsTestStore";
import type { ICrmCallForm } from "./crmCallForm";
import CrmCallFields from "./CrmCallFields";

const form: ICrmCallForm = {
    academicYearId: "11",
    studentContractId: "10",
    callTypeId: "1",
    callDate: "2026-09-24T19:48",
    answerTypeId: "3",
    callConversation: "will pay next week",
    mustPayDate: "2026-10-08",
};

function renderFields(values: ICrmCallForm = form) {
    const onChange = vi.fn();
    render(
        <CrmCallFields
            form={values}
            callTypes={crmCallLookups.callTypes}
            answerTypes={crmCallLookups.answerTypes}
            onChange={onChange}
        />
    );
    return onChange;
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const options = (label: string) =>
    Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((o) => [o.value, o.textContent]);

describe("CrmCallFields", () => {
    it("shows the form's values", () => {
        renderFields();

        expect(field("ზარის ტიპი")).toHaveValue("1");
        expect(field("თარიღი და დრო")).toHaveValue("2026-09-24T19:48");
        expect(field("შედეგი")).toHaveValue("3");
        expect(field("საუბრის შინაარსი")).toHaveValue("will pay next week");
        expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveValue("2026-10-08");
    });

    // a new call has no result yet: the empty choice asks for one
    it("lists the types and the results in the given order after an empty choice", () => {
        renderFields();

        expect(options("ზარის ტიპი")).toEqual([
            ["", "-- აირჩიეთ --"],
            ["2", "Another"],
            ["1", "Reminder"],
        ]);
        expect(options("შედეგი")).toEqual([
            ["", "-- აირჩიეთ --"],
            ["3", "Answered"],
            ["2", "No answer"],
            ["1", "Off"],
        ]);
    });

    it("shows an empty new call", () => {
        renderFields({ ...form, answerTypeId: "", callConversation: "", mustPayDate: "" });

        expect(field("შედეგი")).toHaveValue("");
        expect(field("საუბრის შინაარსი")).toHaveValue("");
        expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveValue("");
    });

    // Access required the type, the date and the result; the conversation and the date to pay by are optional
    it("requires the type, the date and the result only", () => {
        renderFields();

        expect(field("ზარის ტიპი")).toBeRequired();
        expect(field("თარიღი და დრო")).toBeRequired();
        expect(field("შედეგი")).toBeRequired();
        expect(field("საუბრის შინაარსი")).not.toBeRequired();
        expect(field("უნდა გადაიხადოს თარიღამდე")).not.toBeRequired();
    });

    it("takes the date with the time and the date to pay by as a day", () => {
        renderFields();

        expect(field("თარიღი და დრო")).toHaveAttribute("type", "datetime-local");
        expect(field("უნდა გადაიხადოს თარიღამდე")).toHaveAttribute("type", "date");
        expect(field("საუბრის შინაარსი").tagName).toBe("TEXTAREA");
    });

    it.each([
        ["ზარის ტიპი", "callTypeId", "2"],
        ["თარიღი და დრო", "callDate", "2026-10-01T10:15"],
        ["შედეგი", "answerTypeId", "1"],
        ["საუბრის შინაარსი", "callConversation", "no answer"],
        ["უნდა გადაიხადოს თარიღამდე", "mustPayDate", "2026-10-20"],
    ])("reports a change of %s as its form field", (label, fieldName, value) => {
        const onChange = renderFields();

        fireEvent.change(field(label), { target: { value } });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(fieldName, value);
    });
});
