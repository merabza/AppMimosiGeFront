//ChargesAndPayments.tsx

import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import GridView from "../appcarcass/grid/GridView";
import CustomColumn from "../appcarcass/grid/columns/CustomColumn";
import type { IGridColumn } from "../appcarcass/grid/GridViewTypes";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetStatementFormLookupsQuery,
    useGetStatementStudentContractsQuery,
    useLazyGetStatementRowsDataQuery,
} from "../redux/api/chargesAndPaymentsApi";
import type { IStatementRow } from "../redux/types/balancesTypes";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import StudentContractPicker from "../payments/StudentContractPicker";
import { formatAmount } from "../payments/paymentsListFilter";
import { useHasChargesAndPaymentsRight } from "./chargesAndPaymentsMenu";
import {
    buildStatementFilterFields,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    previousMonthToDate,
    type IStatementFilter,
} from "./statementFilter";

interface IGridState {
    offset: number;
    rowsCount: number;
}

function column(
    fieldName: string,
    caption: string,
    control: React.ReactNode | null = null
): IGridColumn {
    return {
        caption,
        visible: true,
        //ამონაწერს მხოლოდ თავისი რიგი აქვს: ნაშთი ამ რიგით ითვლება
        sortable: false,
        nullable: true,
        fieldName,
        isKey: false,
        control,
        changingFieldName: "",
        typeName: "",
    };
}

//გადახდა თარიღით, დარიცხვა გაკვეთილის დროითაც
function formatOperationDate(value: string | undefined, row: IStatementRow): string {
    return row.isPayment ? formatDate(value) : formatDateTime(value);
}

const statementColumns: IGridColumn[] = [
    column("id", "ID"),
    column(
        "isPayment",
        "სახე",
        <CustomColumn onGetCell={(value) => (value ? "გადახდა" : "დარიცხვა")} />
    ),
    column(
        "operationDate",
        "თარიღი",
        <CustomColumn onGetCell={(value, record) => formatOperationDate(value, record as IStatementRow)} />
    ),
    column("studentName", "მოსწავლე"),
    column("document", "დოკუმენტი"),
    column("amount", "თანხა", <CustomColumn onGetCell={formatAmount} />),
    column("runningTotal", "ნაშთი", <CustomColumn onGetCell={formatAmount} />),
    //GridView-ს გასაღები სვეტი სჭირდება: დარიცხვისა და გადახდის ID შეიძლება დაემთხვეს
    { ...column("rowKey", "გასაღები"), isKey: true, visible: false },
];

//Access-ის FrmChargesAndPayments: ერთი ან ყველა კონტრაქტის დარიცხვები და გადახდები, ნაშთით, საწყისი და საბოლოო
//ნაშთებით
const ChargesAndPayments: FC = () => {
    const hasRight = useHasChargesAndPaymentsRight();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetStatementFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetStatementRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();

    const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams]);
    const rangeInvalid = isDateRangeInvalid(filter);
    const gridState = useRef<IGridState>({ offset: 0, rowsCount: 10 });

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (rangeInvalid) return;
            getRowsData({
                ...state,
                filterFields: buildStatementFilterFields(filter),
                sortByFields: [],
            });
        },
        [getRowsData, filter, rangeInvalid]
    );

    //ფილტრის შეცვლისას ამონაწერი პირველი გვერდიდან იტვირთება
    useEffect(() => {
        if (hasRight) load({ ...gridState.current, offset: 0 });
    }, [load, hasRight]);

    //GridView-ს სტრიქონის გასაღები სჭირდება
    const gridRows = useMemo(
        () =>
            rowsData && {
                ...rowsData,
                rows: rowsData.rows.map((r) => ({
                    ...r,
                    rowKey: `${r.isPayment ? "p" : "c"}${r.id}`,
                })),
            },
        [rowsData]
    );

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>დარიცხვებისა და გადახდების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<IStatementFilter>) =>
        setSearchParams(filterToSearchParams({ ...filter, ...changes }), {
            replace: true,
        });

    //მოსწავლის ასარჩევი სიის წელი: ბმულში შენახული, თუ არა, მიმდინარე
    const academicYearId =
        filter.academicYearId !== ""
            ? filter.academicYearId
            : (lookups.currentAcademicYearId?.toString() ?? "");

    return (
        <div>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
                    <Col sm="6">
                        <StudentContractPicker
                            id="filterStudent"
                            label="მოსწავლე"
                            academicYears={lookups.academicYears}
                            academicYearId={academicYearId}
                            studentContractId={filter.studentContractId}
                            useStudentContracts={useGetStatementStudentContractsQuery}
                            onYearChange={(yearId) =>
                                setFilter({ academicYearId: yearId, studentContractId: "" })
                            }
                            onContractChange={(studentContractId) =>
                                setFilter({ academicYearId, studentContractId })
                            }
                        />
                    </Col>
                </Row>
                <Row className="mt-2">
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
                    <Col sm="6" className="d-flex align-items-end">
                        <Button
                            variant="outline-secondary"
                            className="me-2"
                            onClick={() => setFilter(previousMonthToDate())}
                        >
                            წინა თვიდან დღემდე
                        </Button>
                        <Button
                            variant="outline-secondary"
                            onClick={() => setFilter({ dateFrom: "", dateTo: "" })}
                        >
                            ყველა თარიღი
                        </Button>
                    </Col>
                </Row>
            </Form>
            {rangeInvalid && (
                <Alert variant="warning">
                    დაწყების თარიღი დასრულების თარიღზე გვიან არის
                </Alert>
            )}
            {!rangeInvalid && rowsData && (
                <div className="fw-bold" data-testid="startBalance">
                    საწყისი ნაშთი: {formatAmount(rowsData.startBalance)}
                </div>
            )}
            <GridView
                gridHeader="დარიცხვები და გადახდები"
                showCountColumn
                columns={statementColumns}
                rowsData={rangeInvalid ? undefined : gridRows}
                loading={isFetching}
                onLoadRows={(offset, rowsCount) => load({ offset, rowsCount })}
            />
            {!rangeInvalid && rowsData && (
                <div className="text-end fw-bold" data-testid="endBalance">
                    საბოლოო ნაშთი: {formatAmount(rowsData.endBalance)}
                </div>
            )}
        </div>
    );
};

export default ChargesAndPayments;
