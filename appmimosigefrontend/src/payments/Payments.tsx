//Payments.tsx

import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import GridView from "../appcarcass/grid/GridView";
import CustomColumn from "../appcarcass/grid/columns/CustomColumn";
import type {
    IGridColumn,
    ISortField,
} from "../appcarcass/grid/GridViewTypes";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetPaymentFormLookupsQuery,
    useLazyGetPaymentsRowsDataQuery,
    useSetPaymentCheckedMutation,
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
import { useDefaultAcademicYearId } from "../academicYear/academicYearChoice";

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

//"შემოწმებულია" ალამი პირდაპირ სიაში, რედაქტორის გახსნის გარეშე (D152). შენახვისას ალმის ნაცვლად spinner ჩანს,
//შეცდომა სიის ზემოთ
const CheckedCell: FC<{ row: IPaymentRow }> = ({ row }) => {
    const dispatch = useAppDispatch();
    const [setPaymentChecked, { isLoading }] = useSetPaymentCheckedMutation();

    async function change(checked: boolean) {
        //ახალი მოქმედება ძველ შეცდომას ასუფთავებს
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await setPaymentChecked({ paymentId: row.id, checked }).unwrap();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და სიის ზემოთ ჩანს
        }
    }

    if (isLoading) return <Spinner size="sm" animation="border" />;

    return (
        <Form.Check
            aria-label={`${row.studentName}: შემოწმებულია`}
            checked={row.checked}
            onChange={(e) => change(e.target.checked)}
        />
    );
};

//"შემოწმებულია" სვეტი მხოლოდ გადახდების შემოწმების უფლების მქონე როლს უჩანს (D77) და ალამი იქვე იცვლება (D152)
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
                      <CustomColumn
                          onGetCell={(_, record) => (
                              <CheckedCell row={record as IPaymentRow} />
                          )}
                      />
                  ),
              ]
            : []),
        //GridView-ს გასაღები სვეტი სჭირდება
        { ...column("id", "ID"), isKey: true, visible: false, sortable: false },
    ];
}

//Access-ის FrmPayments: გადახდების სია ფილტრით (მოსწავლე, ბანკი, თარიღები) და ფილტრის ჯამით
const Payments: FC = () => {
    const dispatch = useAppDispatch();
    const hasRight = useHasPaymentsRight();
    const canCheck = useCanCheckPayments();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetPaymentFormLookupsQuery(undefined, { skip: !hasRight });
    //გლობალურად არჩეული (ზედა მენიუ) ან მიმდინარე სასწავლო წელი (ნაწილი 20)
    const defaultAcademicYearId = useDefaultAcademicYearId(lookups);
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

    //სხვა გვერდის (მაგ. რედაქტორის) დარჩენილი შეცდომა აქ არ უნდა ჩანდეს და ალმის შეცდომა სხვა გვერდზე
    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        return () => {
            dispatch(clearAlert(EAlertKind.ApiMutation));
        };
    }, [dispatch]);

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
            : (defaultAcademicYearId?.toString() ?? "");

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
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
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
