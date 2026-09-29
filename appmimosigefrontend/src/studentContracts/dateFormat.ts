//dateFormat.ts

//API თარიღს "YYYY-MM-DDTHH:mm:ss" ფორმით აბრუნებს (დროის სარტყლის გარეშე), ამიტომ Date-ად არ გარდაიქმნება,
//რომ დღე სარტყლის გამო არ გადაიწიოს

//"2026-09-15T00:00:00" -> "15.09.2026"
export function formatDate(value?: string | null): string {
    if (!value) return "";
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}.${month}.${year}`;
}

//"2026-09-15T10:30:00" -> "15.09.2026 10:30"
export function formatDateTime(value?: string | null): string {
    if (!value) return "";
    return `${formatDate(value)} ${value.slice(11, 16)}`.trim();
}

//<input type="date">-ის მნიშვნელობა: "YYYY-MM-DD"
export function toDateInputValue(value?: string | null): string {
    return value ? value.slice(0, 10) : "";
}

export function todayDateInputValue(now: Date = new Date()): string {
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}
