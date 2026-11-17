import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DateInput from "./DateInput";

function picker(container: HTMLElement): HTMLInputElement {
    return container.querySelector('input[type="date"]') as HTMLInputElement;
}

function renderInput(value: string, props: Partial<Parameters<typeof DateInput>[0]> = {}) {
    const onChange = vi.fn();
    const result = render(
        <>
            <label htmlFor="d">თარიღი</label>
            <DateInput id="d" value={value} onChange={onChange} {...props} />
        </>
    );
    return { ...result, onChange, input: screen.getByLabelText("თარიღი") as HTMLInputElement };
}

//მშობელი, რომელიც მნიშვნელობას ინახავს, როგორც ფილტრი ან ფორმა
function Controlled({ initial, onValue }: { initial: string; onValue: (v: string) => void }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <label htmlFor="d">თარიღი</label>
            <DateInput
                id="d"
                value={value}
                onChange={(v) => {
                    setValue(v);
                    onValue(v);
                }}
            />
            <button type="button" onClick={() => setValue("2026-09-01")}>
                გარედან
            </button>
        </>
    );
}

describe("DateInput", () => {
    it("shows the value as dd.mm.yyyy in a text field with a hint", () => {
        const { input } = renderInput("2026-11-16");
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveValue("16.11.2026");
        expect(input).toHaveAttribute("placeholder", "დდ.თთ.წწწწ");
        expect(input).toBeValid();
    });

    it("shows an empty value as an empty field", () => {
        expect(renderInput("").input).toHaveValue("");
    });

    it("reports only a complete date while typing", () => {
        const { input, onChange } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "01.0" } });
        fireEvent.change(input, { target: { value: "01.09.202" } });
        expect(onChange).not.toHaveBeenCalled();
        expect(input).toBeInvalid();
        expect(input).toHaveClass("is-invalid");

        fireEvent.change(input, { target: { value: "01.09.2026" } });
        expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-09-01");
    });

    it("reports a cleared field as an empty value", () => {
        const { input, onChange } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "" } });
        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
        expect(input).toBeValid();
    });

    it("doesn't report the same date again", () => {
        const { input, onChange } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "16112026" } });
        expect(onChange).not.toHaveBeenCalled();
    });

    it("writes a typed short date out in full on blur", () => {
        const onValue = vi.fn();
        render(<Controlled initial="" onValue={onValue} />);
        const input = screen.getByLabelText("თარიღი");
        fireEvent.change(input, { target: { value: "1.2.26" } });
        expect(input).toHaveValue("1.2.26");
        fireEvent.blur(input);
        expect(input).toHaveValue("01.02.2026");
        expect(onValue).toHaveBeenCalledExactlyOnceWith("2026-02-01");
    });

    it("shows the date again on blur when the parent keeps it after clearing", () => {
        const { input, onChange } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "" } });
        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
        expect(input).toHaveValue("");
        fireEvent.blur(input);
        expect(input).toHaveValue("16.11.2026");
    });

    it("leaves a cleared field empty on blur when the parent clears the value", () => {
        const onValue = vi.fn();
        render(<Controlled initial="2026-11-16" onValue={onValue} />);
        const input = screen.getByLabelText("თარიღი");
        fireEvent.change(input, { target: { value: "" } });
        fireEvent.blur(input);
        expect(input).toHaveValue("");
        expect(onValue).toHaveBeenCalledExactlyOnceWith("");
    });

    it("leaves an invalid text on blur instead of the stored date", () => {
        const { input } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "31.02.2026" } });
        fireEvent.blur(input);
        expect(input).toHaveValue("31.02.2026");
        expect(input).toBeInvalid();
    });

    it("shows a value changed from outside", () => {
        render(<Controlled initial="2026-11-16" onValue={vi.fn()} />);
        fireEvent.click(screen.getByText("გარედან"));
        expect(screen.getByLabelText("თარიღი")).toHaveValue("01.09.2026");
    });

    it("checks min and max", () => {
        const { input } = renderInput("", { min: "2026-09-01", max: "2026-09-30" });
        fireEvent.change(input, { target: { value: "31.08.2026" } });
        expect(input).toBeInvalid();
        expect(input.validationMessage).toBe("თარიღი არ უნდა იყოს 01.09.2026-ზე ადრე");
        expect(input).toHaveAttribute("title", "თარიღი არ უნდა იყოს 01.09.2026-ზე ადრე");
        fireEvent.change(input, { target: { value: "01.10.2026" } });
        expect(input.validationMessage).toBe("თარიღი არ უნდა იყოს 30.09.2026-ზე გვიან");
        fireEvent.change(input, { target: { value: "15.09.2026" } });
        expect(input).toBeValid();
        expect(input).not.toHaveAttribute("title");
    });

    it("leaves an empty required field to the browser's required check", () => {
        const { input } = renderInput("", { required: true });
        expect(input).toBeRequired();
        expect(input.validity.valueMissing).toBe(true);
        expect(input.validity.customError).toBe(false);
    });

    it("opens the browser's calendar from the button and with Alt+Down", () => {
        const { container, input } = renderInput("2026-11-16");
        const showPicker = vi.fn();
        picker(container).showPicker = showPicker;

        fireEvent.click(screen.getByRole("button", { name: "კალენდარი" }));
        expect(showPicker).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(showPicker).toHaveBeenCalledTimes(1);
        const altDown = fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
        expect(showPicker).toHaveBeenCalledTimes(2);
        expect(altDown).toBe(false);
    });

    it("ignores a browser that can't open the calendar", () => {
        const { container } = renderInput("2026-11-16");
        picker(container).showPicker = () => {
            throw new Error("NotAllowedError");
        };
        expect(() =>
            fireEvent.click(screen.getByRole("button", { name: "კალენდარი" }))
        ).not.toThrow();
    });

    it("takes the date chosen in the calendar", () => {
        const onValue = vi.fn();
        const { container } = render(<Controlled initial="2026-11-16" onValue={onValue} />);
        const calendar = picker(container);
        expect(calendar).toHaveValue("2026-11-16");
        expect(calendar).toHaveAttribute("aria-hidden", "true");
        expect(calendar).toHaveAttribute("tabindex", "-1");

        fireEvent.change(calendar, { target: { value: "2026-12-24" } });
        expect(onValue).toHaveBeenCalledExactlyOnceWith("2026-12-24");
        expect(screen.getByLabelText("თარიღი")).toHaveValue("24.12.2026");
    });

    it("shows the typed date in the calendar", () => {
        const { container, input } = renderInput("2026-11-16");
        fireEvent.change(input, { target: { value: "05.01.2027" } });
        expect(picker(container)).toHaveValue("2027-01-05");
    });

    it("disables the field and the button together", () => {
        const { input } = renderInput("2026-11-16", { disabled: true });
        expect(input).toBeDisabled();
        expect(screen.getByRole("button", { name: "კალენდარი" })).toBeDisabled();
    });

    it("passes the class to the wrapper and the aria-label to the field", () => {
        const { container } = render(
            <DateInput aria-label="დაწყება 1" className="w-auto" value="" onChange={vi.fn()} />
        );
        expect(container.firstElementChild).toHaveClass("w-auto");
        expect(screen.getByLabelText("დაწყება 1")).toHaveAttribute("type", "text");
    });
});
