//TextPickerInput.tsx

import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

export interface TextPickerFieldProps {
    id?: string;
    "aria-label"?: string;
    //ბრაუზერის ველის მნიშვნელობის ფორმით ("YYYY-MM-DD", "YYYY-MM-DDTHH:mm") ან ""
    value: string;
    //იძახება მხოლოდ სრული სწორი მნიშვნელობით ან ""-ით (ნახევრად აკრეფილი თარიღი სიას ხელახლა არ ტვირთავს)
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    //მშობლის შემოწმება (მაგალითად, დასრულება დაწყებაზე ადრეა) და მისი ტექსტი ველის ქვეშ
    isInvalid?: boolean;
    feedback?: ReactNode;
}

interface TextPickerInputProps extends TextPickerFieldProps {
    min?: string;
    max?: string;
    placeholder: string;
    //აკრეფილი ტექსტი -> მნიშვნელობა; "" ცარიელისთვის, null არასწორისთვის
    parse: (text: string) => string | null;
    //მნიშვნელობა -> ტექსტი
    format: (value: string) => string;
    //მნიშვნელობა parse-ის ფორმით (მაგალითად, ბრაუზერის გამოტოვებული 0 წამი)
    normalize: (value: string) => string;
    //ტექსტის შეცდომა setCustomValidity-სთვის, "" თუ სწორია
    error: (text: string) => string;
    pickerType: "date" | "datetime-local";
    pickerStep?: number;
}

//ტექსტური ველი ბრაუზერის <input type="date|datetime-local">-ის ნაცვლად: თარიღი იკრიფება ერთი ფორმით
//(ბრაუზერის ენის მიუხედავად), კალენდარი კი ველის გვერდით ღილაკით ან Alt+↓-ით იხსნება
const TextPickerInput: FC<TextPickerInputProps> = ({
    value,
    onChange,
    min,
    max,
    disabled,
    className,
    isInvalid,
    feedback,
    placeholder,
    parse,
    format,
    normalize,
    error: textError,
    pickerType,
    pickerStep,
    ...inputProps
}) => {
    const [text, setText] = useState(() => format(value));
    const [shownValue, setShownValue] = useState(value);
    const textRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLInputElement>(null);
    const normalizedValue = normalize(value);

    //მნიშვნელობა გარედან შეიცვალა (მაგალითად, ღილაკით "ეს თვე" ან ჩატვირთვით)
    if (value !== shownValue) {
        setShownValue(value);
        if (parse(text) !== normalizedValue) setText(format(value));
    }

    const error = textError(text);

    useEffect(() => {
        textRef.current?.setCustomValidity(error);
    }, [error]);

    const changeText = (newText: string) => {
        setText(newText);
        const parsed = parse(newText);
        if (parsed !== null && parsed !== normalizedValue) onChange(parsed);
    };

    const openPicker = () => {
        try {
            pickerRef.current?.showPicker();
        } catch {
            //ბრაუზერს showPicker არ აქვს ან ამ მომენტში არ უშვებს: თარიღი ხელით იკრიფება
        }
    };

    return (
        <div className={className} style={{ position: "relative" }}>
            <InputGroup hasValidation>
                <Form.Control
                    {...inputProps}
                    ref={textRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={placeholder}
                    title={error || undefined}
                    value={text}
                    min={min}
                    max={max}
                    disabled={disabled}
                    isInvalid={error !== "" || isInvalid}
                    onChange={(e) => changeText(e.target.value)}
                    onBlur={() => {
                        //"1.2.26" -> "01.02.2026"; ცარიელი ველი მნიშვნელობას აჩვენებს: თარიღს, თუ მშობელმა
                        //გასუფთავება არ მიიღო (მაგალითად, ნაშთების თარიღი სავალდებულოა)
                        const parsed = parse(text);
                        if (parsed === "") setText(format(value));
                        else if (parsed) setText(format(parsed));
                    }}
                    onKeyDown={(e) => {
                        if (e.altKey && e.key === "ArrowDown") {
                            e.preventDefault();
                            openPicker();
                        }
                    }}
                />
                <Button
                    variant="outline-secondary"
                    title="კალენდარი (Alt+↓)"
                    aria-label="კალენდარი"
                    tabIndex={-1}
                    disabled={disabled}
                    onClick={openPicker}
                >
                    <FontAwesomeIcon icon={faCalendarDays} />
                </Button>
                {feedback && (
                    <Form.Control.Feedback type="invalid">{feedback}</Form.Control.Feedback>
                )}
            </InputGroup>
            {/*მხოლოდ ბრაუზერის კალენდრისთვის: უხილავია და ღილაკის ქვეშ დგას, რომ კალენდარი იქ გაიხსნას.
               min/max არ აქვს, რომ ფორმის შემოწმებამ უხილავი ველი არ მონიშნოს (დიაპაზონს ტექსტის ველი ამოწმებს)*/}
            <input
                ref={pickerRef}
                type={pickerType}
                step={pickerStep}
                tabIndex={-1}
                aria-hidden="true"
                value={parse(text) || normalizedValue}
                onChange={(e) => changeText(format(normalize(e.target.value)))}
                style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 1,
                    height: 1,
                    padding: 0,
                    border: 0,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
};

export default TextPickerInput;
