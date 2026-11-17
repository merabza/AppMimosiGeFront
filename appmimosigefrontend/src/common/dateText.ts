//dateText.ts

import { formatDate } from "../studentContracts/dateFormat";

//თარიღის ველში ხელით აკრეფილი ტექსტი. ბრაუზერის <input type="date"> თარიღს ბრაუზერის ენის ფორმატით
//აჩვენებს (ინგლისურში თვე/დღე/წელი), ამიტომ თარიღი ყოველთვის დდ.თთ.წწწწ ფორმით იკრიფება

export const dateTextPlaceholder = "დდ.თთ.წწწწ";

const minYear = 1900;

function isoDate(year: number, month: number, day: number): string | null {
    if (year < minYear || month < 1 || month > 12 || day < 1) return null;
    //თვის ბოლო დღე: შემდეგი თვის 0 დღე
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > daysInMonth) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

//აკრეფილი ტექსტი -> "YYYY-MM-DD" (<input type="date">-ის მნიშვნელობის ფორმა); ცარიელი -> ""; არასწორი -> null.
//იღებს "16.11.2026", "16/11/2026", "16-11-2026", "1.2.2026", "16.11.26" (2000-იანი წლები), "16112026"
//და ჩასმულ "2026-11-16"-ს
export function parseDateText(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") return "";

    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

    const separated = /^(\d{1,2})[./\- ](\d{1,2})[./\- ](\d{2}|\d{4})$/.exec(trimmed);
    if (separated) {
        const year = Number(separated[3]);
        return isoDate(
            separated[3].length === 2 ? 2000 + year : year,
            Number(separated[2]),
            Number(separated[1])
        );
    }

    const digits = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
    if (digits) return isoDate(Number(digits[3]), Number(digits[2]), Number(digits[1]));

    return null;
}

export function dateTimeTextPlaceholder(seconds: boolean): string {
    return `${dateTextPlaceholder} სთ:წთ${seconds ? ":წმ" : ""}`;
}

//"YYYY-MM-DDTHH:mm[:ss[.SSS]]" -> წამებით ან წამების გარეშე; ბრაუზერი 0 წამს არ წერს
export function normalizeDateTime(value: string, seconds: boolean): string {
    if (value === "") return "";
    const minutes = value.slice(0, 16);
    if (!seconds) return minutes;
    return value.length >= 19 ? value.slice(0, 19) : `${minutes}:00`;
}

//"2026-09-24T19:48[:05]" -> "24.09.2026 19:48[:05]"
export function formatDateTimeText(value: string, seconds: boolean): string {
    if (value === "") return "";
    const normalized = normalizeDateTime(value, seconds);
    return `${formatDate(normalized)} ${normalized.slice(11)}`;
}

//აკრეფილი თარიღი და დრო -> "YYYY-MM-DDTHH:mm" (seconds-ით "YYYY-MM-DDTHH:mm:ss"); ცარიელი -> ""; არასწორი -> null.
//თარიღი parseDateText-ის ფორმებით, დრო "9:05", "09:05" ან "09:05:30" (წამები მხოლოდ seconds-ით; თუ არ წერია, 00);
//იღებს ჩასმულ "2026-09-24T19:48"-საც
export function parseDateTimeText(text: string, seconds: boolean): string | null {
    const trimmed = text.trim();
    if (trimmed === "") return "";

    //დრო ბოლოშია და თარიღს ჰარით ან T-თი გამოეყოფა; მის წინ ყველაფერი თარიღია
    const timeMatch = /[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!timeMatch) return null;
    const date = parseDateText(trimmed.slice(0, timeMatch.index));
    if (!date) return null;
    const [hours, minutes] = [Number(timeMatch[1]), Number(timeMatch[2])];
    const secondsPart = timeMatch[3] === undefined ? 0 : Number(timeMatch[3]);
    if (hours > 23 || minutes > 59 || secondsPart > 59) return null;
    if (!seconds && timeMatch[3] !== undefined) return null;

    const time = [hours, minutes, ...(seconds ? [secondsPart] : [])]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");
    return `${date}T${time}`;
}

export function dateTimeTextError(text: string, seconds: boolean): string {
    return parseDateTimeText(text, seconds) === null
        ? `ჩაწერეთ თარიღი და დრო ფორმით ${dateTimeTextPlaceholder(seconds)}`
        : "";
}

//ველის შეცდომა (setCustomValidity-სთვის): "" თუ ტექსტი ცარიელია ან სწორი თარიღია min-სა და max-ს შორის.
//ცარიელ სავალდებულო ველს ბრაუზერი თვითონ ამოწმებს (required)
export function dateTextError(text: string, min?: string, max?: string): string {
    const value = parseDateText(text);
    if (value === null) return `ჩაწერეთ თარიღი ფორმით ${dateTextPlaceholder}`;
    if (value === "") return "";
    if (min && value < min) return `თარიღი არ უნდა იყოს ${formatDate(min)}-ზე ადრე`;
    if (max && value > max) return `თარიღი არ უნდა იყოს ${formatDate(max)}-ზე გვიან`;
    return "";
}
