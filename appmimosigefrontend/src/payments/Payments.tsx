//Payments.tsx

import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import GridView from "../appcarcass/grid/GridView";
import CustomColumn from "../appcarcass/grid/columns/CustomColumn";
import type {
    IGridColumn,
    ISortField,
} from "../appcarcass/grid/GridViewTypes";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetPaymentFormLookupsQuery,
    useLazyGetPaymentsRowsDataQuery,
} from "../redux/api/paymentsApi";
import type { IPaymentRow } from "../redux/types/paymentsTypes";
import { formatDate } from "../studentContracts/dateFormat";
import StudentContractPicker from "./StudentContractPicker";
import {
    paymentEditUrl,
    useCanCheckPayments,
    useHasPaymentsRight,
} from "./paymentsMenu";
import {
    buildPaymentsFilterFields,
    currentMonthToDate,
    filterFromSearchParams,
    filterToSearchParams,
    formatAmount,
    isDateRangeInvalid,
    type IPaymentsListFilter,
} from "./paymentsListFilter";

interface IGridState {
    offset: number;
    rowsCount: number;
    sortByFields: ISortField[];
}

function column(
    fieldName: string,
    caption: string,
    control: React.ReactNode | null = null
): IGridColumn {
    return {
        caption,
        visible: true,
        sortable: true,
        nullable: true,
        fieldName,
        isKey: false,
        control,
        changingFieldName: "",
        typeName: "",
    };
}

const checkMark = (value: unknown) => (value ? "✓" : "");

//"შემოწმებულია" სვეტი მხოლოდ გადახდების შემოწმების უფლების მქონე როლს უჩანს (D77)
function paymentColumns(canCheck: boolean): IGridColumn[] {
    return [
        column(
            "studentName",
            "მოსწავლე",
            <CustomColumn
                onGetCell={(value, record) => (
                    <Link to={paymentEditUrl((record as IPaymentRow).id)}>
                        {value}
                    </Link>
                )}
            />
        ),
        column(
            "payDate",
            "გადახდის თარიღი",
            <CustomColumn onGetCell={(value) => formatDate(value)} />
        ),
        column("amount", "თანხა", <CustomColumn onGetCell={formatAmount} />),
        column("document", "დოკუმენტი"),
        column("bankName", "ბანკი"),
        ...(canCheck
            ? [
                  column(
                      "checked",
                      "შემოწმებულია",
                      <CustomColumn onGetCell={checkMark} />
                  ),
              ]
            : []),
        //GridView-ს გასაღები სვეტი სჭირდება
        { ...column("id", "ID"), isKey: true, visible: false, sortable: false },
    ];
}

//Access-ის FrmPayments: გადახდების სია ფილტრით (მოსწავლე, ბანკი, თარიღები) და ფილტრის ჯამით
const Payments: FC = () => {
    const hasRight = useHasPaymentsRight();
    const canCheck = useCanCheckPayments();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetPaymentFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetPaymentsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();

    const filter = useMemo(
        () => filterFromSearchParams(searchParams),
        [searchParams]
    );
    const rangeInvalid = isDateRangeInvalid(filter);
    const columns = useMemo(() => paymentColumns(canCheck), [canCheck]);
    const gridState = useRef<IGridState>({
        offset: 0,
        rowsCount: 10,
        sortByFields: [],
    });

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (rangeInvalid) return;
            getRowsData({
                ...state,
                filterFields: buildPaymentsFilterFields(filter),
            });
        },
        [getRowsData, filter, rangeInvalid]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება
    useEffect(() => {
        if (hasRight) load({ ...gridState.current, offset: 0 });
    }, [load, hasRight]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>გადახდების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<IPaymentsListFilter>) =>
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
                            onYearChange={(yearId) =>
                                setFilter({
                                    academicYearId: yearId,
                                    studentContractId: "",
                                })
                            }
                            onContractChange={(studentContractId) =>
                                setFilter({ academicYearId, studentContractId })
                            }
                        />
                    </Col>
                    <Col sm="3">
                        <Form.Label htmlFor="filterBank">ბანკი</Form.Label>
                        <Form.Select
                            id="filterBank"
                            value={filter.bankAccountId}
                            onChange={(e) =>
                                setFilter({ bankAccountId: e.target.value })
                            }
                        >
                            <option value="">ყველა</option>
                            {lookups.bankAccounts.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
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
            </Form>
            {rangeInvalid && (
                <Alert variant="warning">
                    დაწყების თარიღი დასრულების თარიღზე გვიან არის
                </Alert>
            )}
            <GridView
                gridHeader="გადახდები"
                showCountColumn
                columns={columns}
                rowsData={rangeInvalid ? undefined : rowsData}
                loading={isFetching}
                allowCreate
                editorLink={paymentEditUrl()}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
            {!rangeInvalid && rowsData && (
                //Access-ის ფორმის footer: ფილტრის ყველა გადახდის ჯამი
                <div className="text-end fw-bold" data-testid="paymentsTotal">
                    ჯამი: {formatAmount(rowsData.totalAmount)}
                </div>
            )}
        </div>
    );
};

export default Payments;
