//ReportView.tsx

import type { FC } from "react";
import { Table } from "react-bootstrap";
import type { IReport, IReportColumn, ReportCell, ReportColumnType } from "../redux/types/reportsTypes";
import { formatCell, isNumericColumn } from "./reportsForm";

type ReportViewProps = {
    report: IReport;
};

//ამაზე მეტი სვეტის რეპორტი ფართოა (მაგ. r30, 14 სვეტი; r36, 38 სვეტი): ბეჭდვისას ლანდშაფტით და პატარა შრიფტით
//(reports.css); Excel-ის ფაილიც ლანდშაფტზეა (OpenXmlReportExcelWriter-ის WideReportColumns, ორივე ერთად იცვლება)
const wideReportColumns = 12;

//კომპაქტური საბეჭდი ფორმები (r01, დღის კომენტარები): ბეჭდვისას პატარა მასშტაბით და უჯრებში გადატანილი ტექსტით, რომ
//სექციის გრძელი სათაური და კომენტარი ფურცლის სიგანეში ჩაეტიოს (reports.css)
const compactPrintReportKeys = ["r01Comments"];

//ამაზე გრძელი ტექსტი (მაგ. კომენტარი) კომპაქტურ საბეჭდ ფორმაში უჯრაში გადაიტანება, მოკლე (სახელი, თარიღი) კი ერთ
//ხაზზე რჩება (reports.css)
const longTextLength = 40;

//ამაზე გრძელი სვეტის სათაური (მაგ. r22-ის „თეორიულად მინიმალური თარიღი") ბეჭდვისას რამდენიმე ხაზზე გადაიტანება, რომ
//ცხრილი ფურცლის სიგანეს არ გასცდეს; მოკლე სათაური ერთ ხაზზე რჩება (reports.css)
const longCaptionLength = 20;

//რიცხვი მარჯვნივ სწორდება, გრძელი ტექსტი report-cell-long კლასით აღინიშნება
function cellClassName(type: ReportColumnType, text: string): string | undefined {
    if (isNumericColumn(type)) return "text-end";
    return text.length > longTextLength ? "report-cell-long" : undefined;
}

function Cells({ row, columns }: { row: ReportCell[]; columns: IReportColumn[] }) {
    return (
        <>
            {columns.map((column, index) => {
                const text = formatCell(row[index] ?? null, column.type);
                return (
                    <td key={column.name} className={cellClassName(column.type, text)}>
                        {text}
                    </td>
                );
            })}
        </>
    );
}

//რეპორტის შედეგი: სათაური, პარამეტრები, ცხრილი; დაჯგუფებული რეპორტის ყოველ სექციას სათაურის სტრიქონი და,
//საჭიროებისას, ჯამის სტრიქონი აქვს; ბოლოს რეპორტის ჯამები. ბეჭდვისას მხოლოდ ეს ნაწილი ჩანს და newPage სექცია
//ახალი გვერდიდან იწყება (reports.css). ფართო ცხრილი ეკრანზე თავის ადგილას გადაიხვევა, გვერდი არ ფართოვდება
const ReportView: FC<ReportViewProps> = ({ report }) => {
    const rowsCount = report.sections.reduce((count, section) => count + section.rows.length, 0);
    const wide = report.columns.length > wideReportColumns;
    const compact = compactPrintReportKeys.includes(report.key);
    const printAreaClassName = [
        "report-print-area",
        wide && "report-print-area-wide",
        compact && "report-print-area-compact",
    ]
        .filter(Boolean)
        .join(" ");
    return (
        <div className={printAreaClassName} data-testid="reportView">
            <h4>{report.title}</h4>
            {report.parameters.length > 0 && (
                <p className="mb-2">
                    {report.parameters.map((p) => `${p.caption}: ${p.value}`).join("; ")}
                </p>
            )}
            {rowsCount === 0 ? (
                <p>მონაცემები არ არის</p>
            ) : (
                <div className="report-table-scroll">
                    <Table
                        size="sm"
                        bordered
                        striped
                        className={wide ? "report-table report-table-wide" : "report-table"}
                    >
                        <thead>
                            <tr>
                                {report.columns.map((column) => (
                                    <th
                                        key={column.name}
                                        className={
                                            column.caption.length > longCaptionLength ? "report-caption-long" : undefined
                                        }
                                    >
                                        {column.caption}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        {report.sections.map((section, sectionIndex) => (
                            <tbody
                                key={sectionIndex}
                                className={section.newPage ? "report-section-new-page" : undefined}
                            >
                                {section.header !== null && (
                                    <tr className="fw-bold">
                                        <td colSpan={report.columns.length}>{section.header}</td>
                                    </tr>
                                )}
                                {section.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <Cells row={row} columns={report.columns} />
                                    </tr>
                                ))}
                                {section.footer !== null && (
                                    <tr className="fw-bold">
                                        <Cells row={section.footer} columns={report.columns} />
                                    </tr>
                                )}
                            </tbody>
                        ))}
                        {report.footerRows.length > 0 && (
                            <tfoot>
                                {report.footerRows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="fw-bold">
                                        <Cells row={row} columns={report.columns} />
                                    </tr>
                                ))}
                            </tfoot>
                        )}
                    </Table>
                </div>
            )}
        </div>
    );
};

export default ReportView;
