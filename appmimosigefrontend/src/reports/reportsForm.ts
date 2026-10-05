//reportsForm.ts

import { formatDate, formatDateTime, todayDateInputValue } from "../studentContracts/dateFormat";
import type {
    IReportCatalog,
    IReportInfo,
    IReportParameters,
    ReportCell,
    ReportColumnType,
    ReportParameterName,
} from "../redux/types/reportsTypes";

export const reportParameterNames: ReportParameterName[] = [
    "startDate",
    "endDate",
    "teacherId",
    "courseId",
    "studentId",
    "academicYearId",
];

//წლის პარამეტრის "ყველა წელი"; ცარიელი მნიშვნელობა ნაგულისხმევი (გლობალური ან მიმდინარე) წელია
export const allAcademicYears = "all";

//გვერდის მდგომარეობა ბმულში: კატეგორია, რეპორტი და ფილტრები (ცარიელი გასაღები = პირველი)
export interface IReportsPageState {
    categoryKey: string;
    reportKey: string;
    parameters: IReportParameters;
}

//Access-ის FrmMain-ის ნაგულისხმევი: "თარიღიდან" მიმდინარე თვის 1 რიცხვი, "თარიღამდე" დღეს
export function defaultParameters(now: Date = new Date()): IReportParameters {
    return {
        startDate: todayDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: todayDateInputValue(now),
        teacherId: "",
        courseId: "",
        studentId: "",
        academicYearId: "",
    };
}

//რეპორტისთვის გასაგზავნი პარამეტრები: ცარიელი წელი ნაგულისხმევია, "ყველა" კი პარამეტრის გარეშე
export function resolveAcademicYear(
    parameters: IReportParameters,
    defaultAcademicYearId: number | null
): IReportParameters {
    let academicYearId = parameters.academicYearId;
    if (academicYearId === allAcademicYears) academicYearId = "";
    else if (academicYearId === "") academicYearId = defaultAcademicYearId?.toString() ?? "";
    return { ...parameters, academicYearId };
}

//ბმულში არარსებული თარიღი ნაგულისხმევია, ცარიელი თარიღი კი ცარიელი რჩება
export function stateFromSearchParams(params: URLSearchParams, now: Date = new Date()): IReportsPageState {
    const defaults = defaultParameters(now);
    const parameters = { ...defaults };
    for (const name of reportParameterNames) {
        const value = params.get(name);
        if (value !== null) parameters[name] = value;
    }
    return {
        categoryKey: params.get("category") ?? "",
        reportKey: params.get("report") ?? "",
        parameters,
    };
}

export function stateToSearchParams(state: IReportsPageState): URLSearchParams {
    const params = new URLSearchParams();
    if (state.categoryKey !== "") params.set("category", state.categoryKey);
    if (state.reportKey !== "") params.set("report", state.reportKey);
    for (const name of reportParameterNames) params.set(name, state.parameters[name]);
    return params;
}

//კატეგორიის რეპორტები კატალოგის რიგით
export function reportsOfCategory(catalog: IReportCatalog, categoryKey: string): IReportInfo[] {
    const category = catalog.categories.find((c) => c.key === categoryKey);
    if (!category) return [];
    return category.reportKeys
        .map((key) => catalog.reports.find((r) => r.key === key))
        .filter((r): r is IReportInfo => r !== undefined);
}

//არჩეული ან (Access-ის მსგავსად) სიის პირველი
export function selectedOrFirst<T extends { key: string }>(items: T[], key: string): T | undefined {
    return items.find((item) => item.key === key) ?? items[0];
}

export function usesParameter(report: IReportInfo, name: ReportParameterName): boolean {
    return report.parameters.some((p) => p.name === name);
}

//პირველი შეუვსებელი სავალდებულო პარამეტრის წარწერა
export function missingRequiredCaption(report: IReportInfo, parameters: IReportParameters): string | null {
    return report.parameters.find((p) => p.required && parameters[p.name] === "")?.caption ?? null;
}

//ცარიელი "თარიღიდან" არცერთ თარიღზე მეტი არ არის, ცარიელი "თარიღამდე" კი ცალკე მოწმდება
export function isPeriodInvalid(report: IReportInfo, parameters: IReportParameters): boolean {
    return (
        usesParameter(report, "startDate") &&
        usesParameter(report, "endDate") &&
        parameters.endDate !== "" &&
        parameters.startDate > parameters.endDate
    );
}

//მხოლოდ რეპორტის შევსებული პარამეტრები: "endDate=2026-10-02&teacherId=5"
export function reportQueryString(report: IReportInfo, parameters: IReportParameters): string {
    const params = new URLSearchParams();
    for (const parameter of report.parameters) {
        const value = parameters[parameter.name];
        if (value !== "") params.set(parameter.name, value);
    }
    return params.toString();
}

//სერვერის წესი (ReportParameterRules.ExcelFileName): გასაღები და რეპორტის თარიღები, მაგ. r03RoomsAgenda_2026-10-02.xlsx
export function excelFileName(report: IReportInfo, parameters: IReportParameters): string {
    const dates = report.parameters
        .filter((p) => (p.name === "startDate" || p.name === "endDate") && parameters[p.name] !== "")
        .map((p) => parameters[p.name]);
    return `${[report.key, ...dates].join("_")}.xlsx`;
}

//სერვერის TimeOnly: "HH:mm:ss" ან წამის ნაწილით; "HH:mm" ისედაც უცვლელად ჩანს
const timePattern = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}/;

//უჯრის ტექსტი სვეტის ტიპით; ტიპს შეუსაბამო ტექსტი (მაგ. ჯამის წარწერა "სულ:") უცვლელად ჩანს
export function formatCell(value: ReportCell, type: ReportColumnType): string {
    if (value === null) return "";
    if (typeof value === "number") return type === "number" ? value.toFixed(2) : String(value);
    if (type === "time" && timePattern.test(value)) return value.slice(0, 5);
    if (type === "date" && datePattern.test(value)) return formatDate(value);
    if (type === "dateTime" && datePattern.test(value)) return formatDateTime(value);
    return value;
}

//რიცხვის სვეტი მარჯვნივ სწორდება
export function isNumericColumn(type: ReportColumnType): boolean {
    return type === "number" || type === "wholeNumber";
}
