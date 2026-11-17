//DateTimeInput.tsx

import type { FC } from "react";
import {
    dateTimeTextError,
    dateTimeTextPlaceholder,
    formatDateTimeText,
    normalizeDateTime,
    parseDateTimeText,
} from "./dateText";
import TextPickerInput, { type TextPickerFieldProps } from "./TextPickerInput";

interface DateTimeInputProps extends TextPickerFieldProps {
    //წამის სიზუსტით (<input type="datetime-local" step="1">-ის მსგავსად)
    seconds?: boolean;
}

//თარიღისა და დროის ველი <input type="datetime-local">-ის ნაცვლად: მნიშვნელობა "YYYY-MM-DDTHH:mm"
//(seconds-ით "YYYY-MM-DDTHH:mm:ss"), ტექსტი "დდ.თთ.წწწწ სთ:წთ[:წმ]"
const DateTimeInput: FC<DateTimeInputProps> = ({ seconds = false, ...props }) => (
    <TextPickerInput
        {...props}
        placeholder={dateTimeTextPlaceholder(seconds)}
        parse={(text) => parseDateTimeText(text, seconds)}
        format={(value) => formatDateTimeText(value, seconds)}
        normalize={(value) => normalizeDateTime(value, seconds)}
        error={(text) => dateTimeTextError(text, seconds)}
        pickerType="datetime-local"
        pickerStep={seconds ? 1 : undefined}
    />
);

export default DateTimeInput;
