//SalaryLines.tsx

import type { FC } from "react";
import { Table } from "react-bootstrap";
import type { ISalaryLine, ISalaryLineDetail } from "../redux/types/salaryTypes";
import { formatMoney, formatMonth, salaryLineTotals } from "./salaryForm";

interface SalaryLinesProps {
    lines: ISalaryLine[];
    details: ISalaryLineDetail[];
}

//გამოთვლის შედეგი, მხოლოდ საჩვენებელი: სტრიქონები ჯამებით (Access-ის SalaryLines subform და ფორმის ქვედა ნაწილი) და
//სტრიქონების დეტალები ჯგუფებით
const SalaryLines: FC<SalaryLinesProps> = ({ lines, details }) => {
    const totals = salaryLineTotals(lines);
    return (
        <div>
            <h6>სტრიქონები</h6>
            <Table striped bordered hover size="sm" responsive>
                <thead>
                    <tr>
                        <th>თანამშრომელი</th>
                        <th>თვე</th>
                        <th className="text-end">ნამუშევარი (დამრგვალებული)</th>
                        <th className="text-end">დარიცხული</th>
                        <th className="text-end">საპენსიო 2%</th>
                        <th className="text-end">დარიცხულს გამოკლებული საპენსიო</th>
                        <th className="text-end">საშემოსავლო</th>
                        <th className="text-end">ინდ. საშემოსავლო</th>
                        <th className="text-end">გამოქვითვა</th>
                        <th className="text-end">საპენსიო 4%</th>
                        <th className="text-end">გადასარიცხი</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line) => (
                        <tr key={line.saId}>
                            <td>{line.employeeName}</td>
                            <td>{formatMonth(line.saMonthDate)}</td>
                            <td className="text-end">{formatMoney(line.saNetAmountRound)}</td>
                            <td className="text-end">{formatMoney(line.saAmountGross)}</td>
                            <td className="text-end">{formatMoney(line.saPension2)}</td>
                            <td className="text-end">{formatMoney(line.saGrossMinusPension)}</td>
                            <td className="text-end">{formatMoney(line.saIncomeTax)}</td>
                            <td className="text-end">{formatMoney(line.saIndividualIncomeTax)}</td>
                            <td className="text-end">{formatMoney(line.saGamokvitva)}</td>
                            <td className="text-end">{formatMoney(line.saPension4)}</td>
                            <td className="text-end">{formatMoney(line.saAmountNet)}</td>
                        </tr>
                    ))}
                    {lines.length === 0 && (
                        <tr>
                            <td colSpan={11}>სტრიქონები არ არის: უწყისი ჯერ არ გამოთვლილა</td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="fw-bold" data-testid="salary-totals">
                        <td colSpan={2}>ჯამი</td>
                        <td className="text-end">{formatMoney(totals.saNetAmountRound)}</td>
                        <td className="text-end">{formatMoney(totals.saAmountGross)}</td>
                        <td className="text-end">{formatMoney(totals.saPension2)}</td>
                        <td className="text-end">{formatMoney(totals.saGrossMinusPension)}</td>
                        <td className="text-end">{formatMoney(totals.saIncomeTax)}</td>
                        <td className="text-end">{formatMoney(totals.saIndividualIncomeTax)}</td>
                        <td className="text-end">{formatMoney(totals.saGamokvitva)}</td>
                        <td className="text-end">{formatMoney(totals.saPension4)}</td>
                        <td className="text-end">{formatMoney(totals.saAmountNet)}</td>
                    </tr>
                    <tr>
                        <td colSpan={10}>სულ (გადასარიცხი + საშემოსავლო + საპენსიოს 4%)</td>
                        <td className="text-end fw-bold" data-testid="salary-total">
                            {formatMoney(totals.total)}
                        </td>
                    </tr>
                </tfoot>
            </Table>

            <h6>დეტალები ჯგუფების მიხედვით</h6>
            <Table striped bordered hover size="sm">
                <thead>
                    <tr>
                        <th>თანამშრომელი</th>
                        <th>ჯგუფი</th>
                        <th className="text-end">საათები</th>
                        <th className="text-end">თანხა</th>
                        <th className="text-end">ერთი საათის ღირებულება</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((detail) => (
                        <tr key={detail.sadId}>
                            <td>{detail.employeeName}</td>
                            <td>{detail.groupCode}</td>
                            <td className="text-end">{detail.sadHoursCount}</td>
                            <td className="text-end">{formatMoney(detail.sadAmount)}</td>
                            <td className="text-end">{formatMoney(detail.sadHourCost)}</td>
                        </tr>
                    ))}
                    {details.length === 0 && (
                        <tr>
                            <td colSpan={5}>დეტალები არ არის</td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </div>
    );
};

export default SalaryLines;
