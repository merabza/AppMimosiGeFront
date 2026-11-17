import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatDate } from "../studentContracts/dateFormat";
import { parseDateText } from "./dateText";
import TextPickerInput from "./TextPickerInput";

// DateInput.test.tsx and DateTimeInput.test.tsx cover the shared behaviour through the two wrappers;
// these tests cover what neither wrapper exercises
function renderField(value: string) {
    const onChange = vi.fn();
    const { container } = render(
        <TextPickerInput
            aria-label="თარიღი"
            value={value}
            onChange={onChange}
            placeholder="დდ.თთ.წწწწ"
            parse={parseDateText}
            format={formatDate}
            normalize={(stored) => stored}
            error={(text) => (parseDateText(text) === null ? "invalid" : "")}
            pickerType="date"
        />
    );
    return {
        onChange,
        wrapper: container.firstElementChild as HTMLElement,
        input: screen.getByLabelText("თარიღი") as HTMLInputElement,
        picker: container.querySelector('input[type="date"]') as HTMLInputElement,
        button: screen.getByRole("button", { name: "კალენდარი" }),
    };
}

describe("TextPickerInput", () => {
    it("keeps the calendar button out of the tab order", () => {
        const { button } = renderField("2026-11-16");
        expect(button).toHaveAttribute("tabindex", "-1");
    });

    it("names the keyboard shortcut on the calendar button", () => {
        const { button } = renderField("2026-11-16");
        expect(button).toHaveAttribute("title", "კალენდარი (Alt+↓)");
    });

    it("offers a numeric keyboard and no autocomplete list", () => {
        const { input } = renderField("");
        expect(input).toHaveAttribute("inputmode", "numeric");
        expect(input).toHaveAttribute("autocomplete", "off");
    });

    it("hides the browser's calendar field under the button without taking clicks", () => {
        const { wrapper, picker } = renderField("2026-11-16");
        expect(wrapper).toHaveStyle({ position: "relative" });
        expect(picker).toHaveStyle({ position: "absolute", opacity: "0", pointerEvents: "none" });
    });

    it("doesn't open the calendar for Alt with another key", () => {
        const { input, picker } = renderField("2026-11-16");
        const showPicker = vi.fn();
        picker.showPicker = showPicker;

        const altUp = fireEvent.keyDown(input, { key: "ArrowUp", altKey: true });

        expect(showPicker).not.toHaveBeenCalled();
        expect(altUp).toBe(true);
    });

    it("shows the stored value in the calendar while the text is invalid", () => {
        const { input, picker } = renderField("2026-11-16");
        fireEvent.change(input, { target: { value: "05.01.2027" } });
        expect(picker).toHaveValue("2027-01-05");

        fireEvent.change(input, { target: { value: "05.01" } });

        expect(picker).toHaveValue("2026-11-16");
    });

    it("clears a blank text on blur", () => {
        const { input, onChange } = renderField("");
        fireEvent.change(input, { target: { value: "   " } });

        fireEvent.blur(input);

        expect(input).toHaveValue("");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("writes the typed date out in full on blur, not the stored one", () => {
        // the parent hasn't taken the typed date (yet): the field keeps showing what was typed
        const { input, onChange } = renderField("2026-11-16");
        fireEvent.change(input, { target: { value: "5.1.2027" } });
        expect(onChange).toHaveBeenCalledExactlyOnceWith("2027-01-05");

        fireEvent.blur(input);

        expect(input).toHaveValue("05.01.2027");
    });
});
