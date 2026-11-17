import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DateTimeInput from "./DateTimeInput";

function picker(container: HTMLElement): HTMLInputElement {
    return container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
}

function Controlled({
    initial,
    seconds = false,
    onValue,
}: {
    initial: string;
    seconds?: boolean;
    onValue: (v: string) => void;
}) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <label htmlFor="dt">დრო</label>
            <DateTimeInput
                id="dt"
                seconds={seconds}
                value={value}
                onChange={(v) => {
                    setValue(v);
                    onValue(v);
                }}
            />
        </>
    );
}

const input = () => screen.getByLabelText("დრო") as HTMLInputElement;

describe("DateTimeInput", () => {
    it("shows the value as dd.mm.yyyy hh:mm with a hint", () => {
        const { container } = render(<Controlled initial="2026-09-24T19:48" onValue={vi.fn()} />);
        expect(input()).toHaveAttribute("type", "text");
        expect(input()).toHaveValue("24.09.2026 19:48");
        expect(input()).toHaveAttribute("placeholder", "დდ.თთ.წწწწ სთ:წთ");
        expect(picker(container)).toHaveValue("2026-09-24T19:48");
        expect(picker(container)).not.toHaveAttribute("step");
    });

    it("reports only a complete date and time", () => {
        const onValue = vi.fn();
        render(<Controlled initial="2026-09-24T19:48" onValue={onValue} />);
        fireEvent.change(input(), { target: { value: "25.09.2026" } });
        fireEvent.change(input(), { target: { value: "25.09.2026 10:3" } });
        expect(onValue).not.toHaveBeenCalled();
        expect(input()).toBeInvalid();
        expect(input().validationMessage).toBe("ჩაწერეთ თარიღი და დრო ფორმით დდ.თთ.წწწწ სთ:წთ");

        fireEvent.change(input(), { target: { value: "25.09.2026 10:30" } });
        expect(onValue).toHaveBeenCalledExactlyOnceWith("2026-09-25T10:30");
        expect(input()).toBeValid();
    });

    it("writes a short date and time out in full on blur", () => {
        render(<Controlled initial="" onValue={vi.fn()} />);
        fireEvent.change(input(), { target: { value: "1.2.26 9:05" } });
        fireEvent.blur(input());
        expect(input()).toHaveValue("01.02.2026 09:05");
    });

    it("keeps the seconds with seconds", () => {
        const onValue = vi.fn();
        const { container } = render(
            <Controlled initial="2026-09-15T11:55:12" seconds onValue={onValue} />
        );
        expect(input()).toHaveValue("15.09.2026 11:55:12");
        expect(input()).toHaveAttribute("placeholder", "დდ.თთ.წწწწ სთ:წთ:წმ");
        expect(picker(container)).toHaveAttribute("step", "1");

        fireEvent.change(input(), { target: { value: "15.09.2026 18:05" } });
        expect(onValue).toHaveBeenCalledExactlyOnceWith("2026-09-15T18:05:00");
        fireEvent.blur(input());
        expect(input()).toHaveValue("15.09.2026 18:05:00");
    });

    it("doesn't report a value the browser wrote without the zero seconds", () => {
        const onValue = vi.fn();
        render(<Controlled initial="2026-09-15T18:05" seconds onValue={onValue} />);
        expect(input()).toHaveValue("15.09.2026 18:05:00");
        fireEvent.change(input(), { target: { value: "15.09.2026 18:05:00" } });
        expect(onValue).not.toHaveBeenCalled();
    });

    it("takes the date and time chosen in the calendar", () => {
        const onValue = vi.fn();
        const { container } = render(
            <Controlled initial="2026-09-15T11:55:12" seconds onValue={onValue} />
        );
        fireEvent.change(picker(container), { target: { value: "2026-09-16T08:30" } });
        expect(onValue).toHaveBeenCalledExactlyOnceWith("2026-09-16T08:30:00");
        expect(input()).toHaveValue("16.09.2026 08:30:00");
    });

    it("opens the calendar from the button", () => {
        const { container } = render(<Controlled initial="" onValue={vi.fn()} />);
        const showPicker = vi.fn();
        picker(container).showPicker = showPicker;
        fireEvent.click(screen.getByRole("button", { name: "კალენდარი" }));
        expect(showPicker).toHaveBeenCalledTimes(1);
    });

    it("shows the parent's check with its text", () => {
        render(
            <DateTimeInput
                aria-label="დასრულება"
                value="2026-09-15T10:00"
                isInvalid
                feedback="დასრულება დაწყებაზე გვიან უნდა იყოს"
                onChange={vi.fn()}
            />
        );
        expect(screen.getByLabelText("დასრულება")).toHaveClass("is-invalid");
        expect(screen.getByText("დასრულება დაწყებაზე გვიან უნდა იყოს")).toHaveClass(
            "invalid-feedback"
        );
    });

    it("shows no feedback without one", () => {
        const { container } = render(
            <DateTimeInput aria-label="დასრულება" value="" onChange={vi.fn()} />
        );
        expect(screen.getByLabelText("დასრულება")).not.toHaveClass("is-invalid");
        expect(container.querySelector(".invalid-feedback")).toBeNull();
    });
});
