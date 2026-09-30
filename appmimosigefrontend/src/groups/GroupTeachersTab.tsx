//GroupTeachersTab.tsx

import type { FC } from "react";
import { Alert, Button, Form, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IGroupFormLookups } from "../redux/types/groupsTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import {
    dayAfter,
    type ITeacherFormRow,
    newTeacherRow,
    selectTeacherContract,
} from "./groupForm";

type GroupTeachersTabProps = {
    rows: ITeacherFormRow[];
    lookups: IGroupFormLookups;
    //სტრიქონები, რომელთა პერიოდები ერთმანეთს ფარავს (გენერატორის შეცდომა 5)
    overlapping: Set<number>;
    onChange: (rows: ITeacherFormRow[]) => void;
};

//Access-ის GroupsByTeachers ქვე-ფორმა: მასწავლებლის კონტრაქტი, ხელფასის სქემა და პერიოდი
const GroupTeachersTab: FC<GroupTeachersTabProps> = (props) => {
    const { rows, lookups, overlapping, onChange } = props;

    const setRow = (
        key: number,
        change: (row: ITeacherFormRow) => ITeacherFormRow
    ) => onChange(rows.map((r) => (r.key === key ? change(r) : r)));

    return (
        <>
            <Table size="sm" bordered responsive>
                <thead>
                    <tr>
                        <th>მასწავლებელი / კონტრაქტი</th>
                        <th>ხელფასის სქემა</th>
                        <th>დაწყება</th>
                        <th>დასრულება</th>
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
                                    aria-label={`მასწავლებელი ${index + 1}`}
                                    style={{ minWidth: "14rem" }}
                                    required
                                    value={row.teacherContractId}
                                    onChange={(e) =>
                                        setRow(row.key, (r) =>
                                            selectTeacherContract(
                                                r,
                                                e.target.value,
                                                lookups.teacherContracts
                                            )
                                        )
                                    }
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {lookups.teacherContracts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            <td>
                                <Form.Select
                                    aria-label={`ხელფასის სქემა ${index + 1}`}
                                    required
                                    value={row.salarySchemaId}
                                    onChange={(e) =>
                                        setRow(row.key, (r) => ({
                                            ...r,
                                            salarySchemaId: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {lookups.salarySchemes.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            <td>
                                <Form.Control
                                    aria-label={`მასწავლებლის დაწყება ${index + 1}`}
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
                                    aria-label={`მასწავლებლის დასრულება ${index + 1}`}
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
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    title="მასწავლებლის წაშლა"
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
                    ერთ დღეს ჯგუფს ორი მასწავლებელი ვერ ეყოლება: მონიშნული
                    მასწავლებლების პერიოდები ერთმანეთს ფარავს (გაკვეთილების
                    გენერატორის შეცდომა 5)
                </Alert>
            )}
            <Button
                variant="outline-primary"
                size="sm"
                onClick={() =>
                    onChange([...rows, newTeacherRow(todayDateInputValue())])
                }
            >
                <FontAwesomeIcon icon="plus" /> მასწავლებლის დამატება
            </Button>
        </>
    );
};

export default GroupTeachersTab;
