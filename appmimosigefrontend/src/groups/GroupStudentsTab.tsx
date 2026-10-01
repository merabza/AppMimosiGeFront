//GroupStudentsTab.tsx

import type { FC } from "react";
import { Alert, Button, Form, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IGroupStudentContractLookup } from "../redux/types/groupsTypes";
import {
    type FeeField,
    recalculateAfterFeeFieldChange,
} from "../studentContracts/contractForm";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import {
    dayAfter,
    type IStudentFormRow,
    newStudentRow,
    selectStudentContract,
} from "./groupForm";

type GroupStudentsTabProps = {
    rows: IStudentFormRow[];
    //ჯგუფის სასწავლო წლის კონტრაქტები; undefined, სანამ იტვირთება
    contracts: IGroupStudentContractLookup[] | undefined;
    courseId: string;
    groupSizeId: string;
    //ერთი კონტრაქტის სტრიქონები, რომელთა პერიოდები ერთმანეთს ფარავს (D64)
    overlapping: Set<number>;
    onChange: (rows: IStudentFormRow[]) => void;
};

//ტარიფის ველები ბაზაში 0-ზე მეტი უნდა იყოს; თანხა 4 ათწილადამდე ინახება (money), ამიტომ ნაბიჯი არ იზღუდება
const tariffColumns: {
    field: FeeField | "hoursCoefficient";
    caption: string;
    min: string;
}[] = [
    { field: "fourWeekHours", caption: "4 კვირის საათები", min: "0.01" },
    { field: "fourWeekFee", caption: "4 კვირის გადასახადი", min: "0.0001" },
    { field: "oneHourFee", caption: "საათის ღირებულება", min: "0.0001" },
    { field: "hoursCoefficient", caption: "საათის კოეფიციენტი", min: "0.01" },
];

//Access-ის GroupsByStudents ქვე-ფორმა: მოსწავლის კონტრაქტი, ტარიფი, პერიოდი და შენიშვნა
const GroupStudentsTab: FC<GroupStudentsTabProps> = (props) => {
    const { rows, contracts, courseId, groupSizeId, overlapping, onChange } =
        props;

    const setRow = (
        key: number,
        change: (row: IStudentFormRow) => IStudentFormRow
    ) => onChange(rows.map((r) => (r.key === key ? change(r) : r)));

    return (
        <>
            <Table size="sm" bordered responsive>
                <thead>
                    <tr>
                        <th>მოსწავლე / კონტრაქტი</th>
                        {tariffColumns.map((c) => (
                            <th key={c.field}>{c.caption}</th>
                        ))}
                        <th>დაწყება</th>
                        <th>დასრულება</th>
                        <th>შენიშვნა</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={row.key}
                            className={
                                overlapping.has(row.key)
                                    ? "table-danger"
                                    : undefined
                            }
                        >
                            <td>
                                <Form.Select
                                    aria-label={`მოსწავლე ${index + 1}`}
                                    style={{ minWidth: "14rem" }}
                                    required
                                    value={row.studentContractId}
                                    onChange={(e) =>
                                        setRow(row.key, (r) =>
                                            selectStudentContract(
                                                r,
                                                contracts?.find(
                                                    (c) =>
                                                        c.scId.toString() ===
                                                        e.target.value
                                                ),
                                                courseId,
                                                groupSizeId
                                            )
                                        )
                                    }
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {/* სხვა წლის (ან ჯერ ჩაუტვირთავ) კონტრაქტს სახელი სტრიქონიდან აქვს */}
                                    {row.studentContractId !== "" &&
                                        !contracts?.some(
                                            (c) =>
                                                c.scId.toString() ===
                                                row.studentContractId
                                        ) && (
                                            <option value={row.studentContractId}>
                                                {row.studentContractName}
                                            </option>
                                        )}
                                    {contracts?.map((c) => (
                                        <option key={c.scId} value={c.scId}>
                                            {c.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            {tariffColumns.map((c) => (
                                <td key={c.field}>
                                    <Form.Control
                                        aria-label={`${c.caption} ${index + 1}`}
                                        type="number"
                                        required
                                        min={c.min}
                                        step="any"
                                        value={row[c.field]}
                                        onChange={(e) =>
                                            setRow(row.key, (r) => ({
                                                ...r,
                                                [c.field]: e.target.value,
                                            }))
                                        }
                                        onBlur={() => {
                                            const field = c.field;
                                            if (field === "hoursCoefficient")
                                                return;
                                            setRow(row.key, (r) =>
                                                recalculateAfterFeeFieldChange(
                                                    r,
                                                    field
                                                )
                                            );
                                        }}
                                    />
                                </td>
                            ))}
                            <td>
                                <Form.Control
                                    aria-label={`მოსწავლის დაწყება ${index + 1}`}
                                    type="date"
                                    required
                                    value={row.startDate}
                                    onChange={(e) =>
                                        setRow(row.key, (r) => ({
                                            ...r,
                                            startDate: e.target.value,
                                        }))
                                    }
                                />
                            </td>
                            <td>
                                <Form.Control
                                    aria-label={`მოსწავლის დასრულება ${index + 1}`}
                                    type="date"
                                    min={dayAfter(row.startDate)}
                                    value={row.endDate}
                                    onChange={(e) =>
                                        setRow(row.key, (r) => ({
                                            ...r,
                                            endDate: e.target.value,
                                        }))
                                    }
                                />
                            </td>
                            <td>
                                <Form.Control
                                    aria-label={`შენიშვნა ${index + 1}`}
                                    maxLength={255}
                                    value={row.note}
                                    onChange={(e) =>
                                        setRow(row.key, (r) => ({
                                            ...r,
                                            note: e.target.value,
                                        }))
                                    }
                                />
                            </td>
                            <td>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    title="მოსწავლის წაშლა ჯგუფიდან"
                                    onClick={() =>
                                        onChange(
                                            rows.filter((r) => r.key !== row.key)
                                        )
                                    }
                                >
                                    <FontAwesomeIcon icon="minus" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            {overlapping.size > 0 && (
                <Alert variant="danger">
                    ერთი მოსწავლე ჯგუფში ერთ დღეს ორჯერ ვერ იქნება: მონიშნული
                    სტრიქონები ერთი კონტრაქტისაა და მათი პერიოდები ერთმანეთს
                    ფარავს
                </Alert>
            )}
            <Button
                variant="outline-primary"
                size="sm"
                onClick={() =>
                    onChange([...rows, newStudentRow(todayDateInputValue())])
                }
            >
                <FontAwesomeIcon icon="plus" /> მოსწავლის დამატება
            </Button>
        </>
    );
};

export default GroupStudentsTab;
