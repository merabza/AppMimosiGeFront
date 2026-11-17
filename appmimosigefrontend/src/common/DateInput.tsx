//DateInput.tsx

import type { FC } from "react";
import { formatDate } from "../studentContracts/dateFormat";
import { dateTextError, dateTextPlaceholder, parseDateText } from "./dateText";
import TextPickerInput, { type TextPickerFieldProps } from "./TextPickerInput";

interface DateInputProps extends TextPickerFieldProps {
    min?: string;
    max?: string;
}

const sameValue = (value: string) => value;

//თარიღის ველი <input type="date">-ის ნაცვლად: მნიშვნელობა "YYYY-MM-DD", ტექსტი დდ.თთ.წწწწ
const DateInput: FC<DateInputProps> = ({ min, max, ...props }) => (
    <TextPickerInput
        {...props}
        min={min}
        max={max}
        placeholder={dateTextPlaceholder}
        parse={parseDateText}
        format={formatDate}
        normalize={sameValue}
        error={(text) => dateTextError(text, min, max)}
        pickerType="date"
    />
);

export default DateInput;
