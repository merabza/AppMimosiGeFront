//reportsTypes.ts

import type { ILookupItem } from "./studentContractsTypes";

//რეპორტის პარამეტრების სახელები: ბმულის პარამეტრები და სერვერის ReportParameterNames
export type ReportParameterName = "startDate" | "endDate" | "teacherId" | "courseId" | "studentId";

export interface IReportParameterInfo {
    name: ReportParameterName;
    caption: string;
    required: boolean;
}

//კატალოგის რეპორტი: გასაღები (Access-ის ReportName), სათაური, აღწერა, პარამეტრები
export interface IReportInfo {
    key: string;
    title: string;
    description: string | null;
    parameters: IReportParameterInfo[];
}

export interface IReportCategory {
    key: string;
    name: string;
    reportKeys: string[];
}

//მხოლოდ ის რეპორტები და კატეგორიები, რომლებზეც მომხმარებელს უფლება აქვს
export interface IReportCatalog {
    categories: IReportCategory[];
    reports: IReportInfo[];
}

export interface IReportLookups {
    teachers: ILookupItem[];
    courses: ILookupItem[];
    students: ILookupItem[];
}

//სვეტის ტიპი სერვერის ReportColumnTypes-ისაა
export type ReportColumnType = "text" | "wholeNumber" | "number" | "time" | "date" | "dateTime";

export interface IReportColumn {
    name: string;
    caption: string;
    type: ReportColumnType;
}

//უჯრა: ტექსტი, რიცხვი, დრო "HH:mm:ss", თარიღი "YYYY-MM-DDTHH:mm:ss"; ცარიელი null
export type ReportCell = string | number | null;

export interface IReportSection {
    header: string | null;
    rows: ReportCell[][];
    footer: ReportCell[] | null;
}

export interface IReportParameterValue {
    name: ReportParameterName;
    caption: string;
    value: string;
}

export interface IReport {
    key: string;
    title: string;
    parameters: IReportParameterValue[];
    columns: IReportColumn[];
    sections: IReportSection[];
    footerRows: ReportCell[][];
}

//ფილტრის მნიშვნელობები: თარიღები "YYYY-MM-DD", ID-ები სტრიქონად; ცარიელი სტრიქონი = მნიშვნელობა არ არის
export type IReportParameters = Record<ReportParameterName, string>;
