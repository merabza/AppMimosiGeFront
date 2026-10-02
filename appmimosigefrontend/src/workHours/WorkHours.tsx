//WorkHours.tsx

import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import GridView from "../appcarcass/grid/GridView";
import CustomColumn from "../appcarcass/grid/columns/CustomColumn";
import type { IGridColumn, ISortField } from "../appcarcass/grid/GridViewTypes";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useAutoGenerateWorkHoursMutation,
    useEndWorkMutation,
    useGetWorkHourFormLookupsQuery,
    useLazyGetWorkHoursRowsDataQuery,
    useStartWorkMutation,
} from "../redux/api/workHoursApi";
import type { IWorkHourRow } from "../redux/types/workHoursTypes";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import { currentMonthToDate } from "../payments/paymentsListFilter";
import { useHasWorkHoursRight, workHourEditUrl } from "./workHoursMenu";
import {
    buildWorkHoursFilterFields,
    canAutoGenerate,
    filterFromSearchParams,
    filterToSearchParams,
    formatHours,
    isDateRangeInvalid,
    luftToRequest,
    type IWorkHoursListFilter,
} from "./workHoursListFilter";

interface IGridState {
    offset: number;
    rowsCount: number;
    sortByFields: ISortField[];
}

//Access-ის ნაგულისხმევი ლუფტი წუთებში
const defaultLuft = "5";

function column(
    fieldName: string,
    caption: string,
    control: React.ReactNode | null = null,
    sortable = true
): IGridColumn {
    return {
        caption,
        visible: true,
        sortable,
        nullable: true,
        fieldName,
        isKey: false,
        control,
        changingFieldName: "",
        typeName: "",
    };
}

const workHourColumns: IGridColumn[] = [
    column(
        "employeeName",
        "თანამშრომელი",
        <CustomColumn
            onGetCell={(value, record) => (
                <Link to={workHourEditUrl((record as IWorkHourRow).id)}>{value}</Link>
            )}
        />
    ),
    column("whStart", "დაწყება", <CustomColumn onGetCell={(value) => formatDateTime(value)} />),
    column("whEnd", "დასრულება", <CustomColumn onGetCell={(value) => formatDateTime(value)} />),
    //ხანგრძლივობა ჩატვირთვის შემდეგ ითვლება, ამიტომ სერვერი მისით არ ალაგებს
    column("hours", "საათები", <CustomColumn onGetCell={formatHours} />, false),
    //GridView-ს გასაღები სვეტი სჭირდება
    { ...column("id", "ID"), isKey: true, visible: false, sortable: false },
];

//Access-ის FrmWorkHours: ადმინისტრაციის თანამშრომლების ნამუშევარი დრო, ფილტრი, "სამუშაოს დაწყება" და "დასრულება"
//ლუფტით, ავტომატური დაგენერირება გაკვეთილებიდან და თანამშრომლების ჯამური საათები პერიოდში
const WorkHours: FC = () => {
    const dispatch = useAppDispatch();
    const hasRight = useHasWorkHoursRight();
    const { data: lookups, isLoading: lookupsLoading } = useGetWorkHourFormLookupsQuery(
        undefined,
        { skip: !hasRight }
    );
    const [getRowsData, { data: rowsData, isFetching }] = useLazyGetWorkHoursRowsDataQuery();
    const [startWork, { isLoading: starting }] = useStartWorkMutation();
    const [endWork, { isLoading: ending }] = useEndWorkMutation();
    const [autoGenerate, { isLoading: generating }] = useAutoGenerateWorkHoursMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();
    const [luft, setLuft] = useState(defaultLuft);
    const [message, setMessage] = useState<string | null>(null);
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

    const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams]);
    const rangeInvalid = isDateRangeInvalid(filter);
    const gridState = useRef<IGridState>({ offset: 0, rowsCount: 10, sortByFields: [] });

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (rangeInvalid) return;
            getRowsData({ ...state, filterFields: buildWorkHoursFilterFields(filter) });
        },
        [getRowsData, filter, rangeInvalid]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება
    useEffect(() => {
        if (hasRight) load({ ...gridState.current, offset: 0 });
    }, [load, hasRight]);

    //სხვა გვერდის დარჩენილი შეცდომა აქ არ უნდა ჩანდეს
    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>სამუშაო საათების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<IWorkHoursListFilter>) =>
        setSearchParams(filterToSearchParams({ ...filter, ...changes }), { replace: true });

    const working = starting || ending || generating;

    //ახალი მოქმედება ძველ შედეგს და შეცდომას ასუფთავებს
    function beginAction() {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setMessage(null);
    }

    async function fixStart() {
        beginAction();
        try {
            const workHour = await startWork({
                teacherContractId: Number(filter.teacherContractId),
                luftMinutes: luftToRequest(luft),
            }).unwrap();
            setMessage(
                `სამუშაოს დაწყება დაფიქსირდა: ${workHour.employeeName}, ${formatDateTime(workHour.whStart)}`
            );
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function fixEnd() {
        beginAction();
        try {
            const workHour = await endWork({
                teacherContractId: Number(filter.teacherContractId),
                luftMinutes: luftToRequest(luft),
            }).unwrap();
            setMessage(
                `სამუშაოს დასრულება დაფიქსირდა: ${workHour.employeeName}, ${formatDateTime(workHour.whEnd)}`
            );
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function generate() {
        setShowGenerateConfirm(false);
        beginAction();
        try {
            const result = await autoGenerate({
                dateFrom: filter.dateFrom,
                dateTo: filter.dateTo,
            }).unwrap();
            setMessage(
                result.createdCount === 0
                    ? "ახალი ჩანაწერი არ დაგენერირდა"
                    : `დაგენერირდა ${result.createdCount} ჩანაწერი`
            );
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    const noEmployee = filter.teacherContractId === "";

    return (
        <div>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
                    <Col sm="4">
                        <Form.Label htmlFor="filterEmployee">თანამშრომელი</Form.Label>
                        <Form.Select
                            id="filterEmployee"
                            value={filter.teacherContractId}
                            onChange={(e) => setFilter({ teacherContractId: e.target.value })}
                        >
                            <option value="">ყველა</option>
                            {lookups.employees.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col sm="2">
                        <Form.Label htmlFor="filterDateFrom">თარიღიდან</Form.Label>
                        <Form.Control
                            id="filterDateFrom"
                            type="date"
                            value={filter.dateFrom}
                            onChange={(e) => setFilter({ dateFrom: e.target.value })}
                        />
                    </Col>
                    <Col sm="2">
                        <Form.Label htmlFor="filterDateTo">თარიღამდე</Form.Label>
                        <Form.Control
                            id="filterDateTo"
                            type="date"
                            value={filter.dateTo}
                            onChange={(e) => setFilter({ dateTo: e.target.value })}
                        />
                    </Col>
                    <Col sm="4" className="d-flex align-items-end">
                        <Button
                            variant="outline-secondary"
                            className="me-2"
                            onClick={() => setFilter(currentMonthToDate())}
                        >
                            ეს თვე
                        </Button>
                        <Button
                            variant="outline-secondary"
                            onClick={() => setFilter({ dateFrom: "", dateTo: "" })}
                        >
                            ყველა თარიღი
                        </Button>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col sm="2">
                        <Form.Label htmlFor="luft">ლუფტი წუთებში</Form.Label>
                        <Form.Control
                            id="luft"
                            type="number"
                            step="1"
                            value={luft}
                            onChange={(e) => setLuft(e.target.value)}
                        />
                    </Col>
                    <Col sm="10" className="d-flex align-items-end flex-wrap gap-2">
                        <Button disabled={noEmployee || working} onClick={fixStart}>
                            სამუშაოს დაწყება
                            {starting && <Spinner size="sm" animation="border" className="ms-1" />}
                        </Button>
                        <Button disabled={noEmployee || working} onClick={fixEnd}>
                            სამუშაოს დასრულება
                            {ending && <Spinner size="sm" animation="border" className="ms-1" />}
                        </Button>
                        <Button
                            variant="outline-primary"
                            disabled={!canAutoGenerate(filter) || working}
                            onClick={() => setShowGenerateConfirm(true)}
                        >
                            მიმდინარე თვის ავტომატური დაგენერირება დღემდე
                            {generating && <Spinner size="sm" animation="border" className="ms-1" />}
                        </Button>
                    </Col>
                </Row>
                {noEmployee && (
                    <Form.Text>სამუშაოს დაწყებისა და დასრულებისთვის აირჩიეთ თანამშრომელი</Form.Text>
                )}
            </Form>
            {message && <Alert variant="success">{message}</Alert>}
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
            {rangeInvalid && (
                <Alert variant="warning">დაწყების თარიღი დასრულების თარიღზე გვიან არის</Alert>
            )}
            <GridView
                gridHeader="სამუშაო საათების შესრულება"
                showCountColumn
                columns={workHourColumns}
                rowsData={rangeInvalid ? undefined : rowsData}
                loading={isFetching}
                allowCreate
                editorLink={workHourEditUrl()}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
            {!rangeInvalid && rowsData && rowsData.totals.length > 0 && (
                <div>
                    <h6>ჯამური საათები პერიოდში</h6>
                    <Table size="sm" bordered className="w-auto" data-testid="workHoursTotals">
                        <thead>
                            <tr>
                                <th>თანამშრომელი</th>
                                <th>საათები</th>
                                <th>ჩანაწერები</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowsData.totals.map((total) => (
                                <tr key={total.teacherContractId}>
                                    <td>{total.employeeName}</td>
                                    <td className="text-end">{formatHours(total.hours)}</td>
                                    <td className="text-end">{total.recordsCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
            <MessageBox
                show={showGenerateConfirm}
                title="სამუშაო დროის ავტომატური დაგენერირება"
                text={`დაგენერირდეს სამუშაო დრო ყველა თანამშრომლისთვის ${formatDate(filter.dateFrom)} - ${formatDate(filter.dateTo)} პერიოდის დღეებზე დღემდე, გაკვეთილების მიხედვით? არსებული ჩანაწერები არ შეიცვლება.`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={generate}
                onClosed={() => setShowGenerateConfirm(false)}
            />
        </div>
    );
};

export default WorkHours;
