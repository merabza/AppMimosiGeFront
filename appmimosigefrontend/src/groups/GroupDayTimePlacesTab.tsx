//GroupDayTimePlacesTab.tsx

import type { FC } from "react";
import { Alert, Button, Form, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import type { IGroupFormLookups } from "../redux/types/groupsTypes";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import {
    dayAfter,
    type IDayTimePlaceFormRow,
    newDayTimePlaceRow,
} from "./groupForm";

type GroupDayTimePlacesTabProps = {
    rows: IDayTimePlaceFormRow[];
    lookups: IGroupFormLookups;
    //სტრიქონები, რომლებიც ერთ კვირის დღეზე ერთმანეთს ფარავს (გენერატორის შეცდომა 7)
    overlapping: Set<number>;
    onChange: (rows: IDayTimePlaceFormRow[]) => void;
};

type LookupField = "weekDayId" | "lessonStartTimeId" | "roomId";

//Access-ის GroupDayTimePlace ქვე-ფორმა: კვირის დღე, დაწყების დრო, საათები, ოთახი და პერიოდი
const GroupDayTimePlacesTab: FC<GroupDayTimePlacesTabProps> = (props) => {
    const { rows, lookups, overlapping, onChange } = props;

    const setRow = (
        key: number,
        change: (row: IDayTimePlaceFormRow) => IDayTimePlaceFormRow
    ) => onChange(rows.map((r) => (r.key === key ? change(r) : r)));

    const lookupSelect = (
        row: IDayTimePlaceFormRow,
        index: number,
        field: LookupField,
        caption: string,
        items: ILookupItem[]
    ) => (
        <Form.Select
            aria-label={`${caption} ${index + 1}`}
            required
            value={row[field]}
            onChange={(e) =>
                setRow(row.key, (r) => ({ ...r, [field]: e.target.value }))
            }
        >
            <option value="">-- აირჩიეთ --</option>
            {items.map((item) => (
                <option key={item.id} value={item.id}>
                    {item.name}
                </option>
            ))}
        </Form.Select>
    );

    return (
        <>
            <Table size="sm" bordered responsive>
                <thead>
                    <tr>
                        <th>კვირის დღე</th>
                        <th>დაწყების დრო</th>
                        <th>საათები</th>
                        <th>ოთახი</th>
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
                                {lookupSelect(
                                    row,
                                    index,
                                    "weekDayId",
                                    "კვირის დღე",
                                    lookups.weekDays
                                )}
                            </td>
                            <td>
                                {lookupSelect(
                                    row,
                                    index,
                                    "lessonStartTimeId",
                                    "დაწყების დრო",
                                    lookups.lessonStartTimes
                                )}
                            </td>
                            <td>
                                <Form.Control
                                    aria-label={`საათები ${index + 1}`}
                                    type="number"
                                    required
                                    min="0.01"
                                    step="any"
                                    value={row.hoursCount}
                                    onChange={(e) =>
                                        setRow(row.key, (r) => ({
                                            ...r,
                                            hoursCount: e.target.value,
                                        }))
                                    }
                                />
                            </td>
                            <td>
                                {lookupSelect(
                                    row,
                                    index,
                                    "roomId",
                                    "ოთახი",
                                    lookups.rooms
                                )}
                            </td>
                            <td>
                                <Form.Control
                                    aria-label={`განრიგის დაწყება ${index + 1}`}
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
                                    aria-label={`განრიგის დასრულება ${index + 1}`}
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
                                    title="განრიგის სტრიქონის წაშლა"
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
                    ერთ კვირის დღეზე ჯგუფს ორი განრიგი ვერ ექნება: მონიშნული
                    სტრიქონების პერიოდები ერთმანეთს ფარავს (გაკვეთილების
                    გენერატორის შეცდომა 7)
                </Alert>
            )}
            <Button
                variant="outline-primary"
                size="sm"
                onClick={() =>
                    onChange([
                        ...rows,
                        newDayTimePlaceRow(todayDateInputValue()),
                    ])
                }
            >
                <FontAwesomeIcon icon="plus" /> განრიგის დამატება
            </Button>
        </>
    );
};

export default GroupDayTimePlacesTab;
