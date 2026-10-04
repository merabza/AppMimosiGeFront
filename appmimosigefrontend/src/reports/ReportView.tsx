//ReportView.tsx

import type { FC } from "react";
import { Table } from "react-bootstrap";
import type { IReport, IReportColumn, ReportCell } from "../redux/types/reportsTypes";
import { formatCell, isNumericColumn } from "./reportsForm";

type ReportViewProps = {
    report: IReport;
};

//ამაზე მეტი სვეტის რეპორტი ფართოა (მაგ. r36, 38 სვეტი): ბეჭდვისას ლანდშაფტით და პატარა შრიფტით (reports.css)
const wideReportColumns = 20;

function Cells({ row, columns }: { row: ReportCell[]; columns: IReportColumn[] }) {
    return (
        <>
            {columns.map((column, index) => (
                <td key={column.name} className={isNumericColumn(column.type) ? "text-end" : undefined}>
                    {formatCell(row[index] ?? null, column.type)}
                </td>
            ))}
        </>
    );
}

//რეპორტის შედეგი: სათაური, პარამეტრები, ცხრილი; დაჯგუფებული რეპორტის ყოველ სექციას სათაურის სტრიქონი და,
//საჭიროებისას, ჯამის სტრიქონი აქვს; ბოლოს რეპორტის ჯამები. ბეჭდვისას მხოლოდ ეს ნაწილი ჩანს (reports.css). ფართო
//ცხრილი ეკრანზე თავის ადგილას გადაიხვევა, გვერდი არ ფართოვდება
const ReportView: FC<ReportViewProps> = ({ report }) => {
    const rowsCount = report.sections.reduce((count, section) => count + section.rows.length, 0);
    const wide = report.columns.length > wideReportColumns;
    return (
        <div className={wide ? "report-print-area report-print-area-wide" : "report-print-area"} data-testid="reportView">
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
                                    <th key={column.name}>{column.caption}</th>
                                ))}
                            </tr>
                        </thead>
                        {report.sections.map((section, sectionIndex) => (
                            <tbody key={sectionIndex}>
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
