//CrmCalls.tsx

import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import GridView from "../appcarcass/grid/GridView";
import CustomColumn from "../appcarcass/grid/columns/CustomColumn";
import type { IGridColumn, ISortField } from "../appcarcass/grid/GridViewTypes";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetCrmCallFormLookupsQuery,
    useGetCrmCallStudentContractsQuery,
    useLazyGetCrmCallsRowsDataQuery,
} from "../redux/api/crmCallsApi";
import type { ICrmCallRow } from "../redux/types/crmCallsTypes";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import StudentContractPicker from "../payments/StudentContractPicker";
import { crmCallEditUrl, useHasCrmCallsRight } from "./crmCallsMenu";
import {
    buildCrmCallsFilterFields,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    shortenText,
    type ICrmCallsListFilter,
} from "./crmCallsListFilter";

interface IGridState {
    offset: number;
    rowsCount: number;
    sortByFields: ISortField[];
}

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

const crmCallColumns: IGridColumn[] = [
    column(
        "callDate",
        "თარიღი",
        <CustomColumn
            onGetCell={(value, record) => (
                <Link to={crmCallEditUrl((record as ICrmCallRow).id)}>
                    {formatDateTime(value as string)}
                </Link>
            )}
        />
    ),
    column("studentName", "მოსწავლე"),
    column("callTypeName", "ზარის ტიპი"),
    column("answerTypeName", "შედეგი"),
    column(
        "callConversation",
        "საუბარი",
        <CustomColumn
            onGetCell={(value) => <span title={(value as string | null) ?? ""}>{shortenText(value)}</span>}
        />,
        false
    ),
    column(
        "mustPayDate",
        "უნდა გადაიხადოს თარიღამდე",
        <CustomColumn onGetCell={(value) => formatDate(value as string | null)} />
    ),
    //GridView-ს გასაღები სვეტი სჭირდება
    { ...column("id", "ID"), isKey: true, visible: false, sortable: false },
];

//Access-ის FrmCRMCalls: ზარების სია ფილტრით (მოსწავლე, თარიღები, ტიპი, შედეგი)
const CrmCalls: FC = () => {
    const hasRight = useHasCrmCallsRight();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetCrmCallFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetCrmCallsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();

    const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams]);
    const rangeInvalid = isDateRangeInvalid(filter);
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
                filterFields: buildCrmCallsFilterFields(filter),
            });
        },
        [getRowsData, filter, rangeInvalid]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება
    useEffect(() => {
        if (hasRight) load({ ...gridState.current, offset: 0 });
    }, [load, hasRight]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>CRM ზარების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<ICrmCallsListFilter>) =>
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
                            useStudentContracts={useGetCrmCallStudentContractsQuery}
                            onYearChange={(yearId) =>
                                setFilter({ academicYearId: yearId, studentContractId: "" })
                            }
                            onContractChange={(studentContractId) =>
                                setFilter({ academicYearId, studentContractId })
                            }
                        />
                    </Col>
                    <Col sm="3">
                        <Form.Label htmlFor="filterCallType">ზარის ტიპი</Form.Label>
                        <Form.Select
                            id="filterCallType"
                            value={filter.callTypeId}
                            onChange={(e) => setFilter({ callTypeId: e.target.value })}
                        >
                            <option value="">ყველა</option>
                            {lookups.callTypes.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col sm="3">
                        <Form.Label htmlFor="filterAnswerType">შედეგი</Form.Label>
                        <Form.Select
                            id="filterAnswerType"
                            value={filter.answerTypeId}
                            onChange={(e) => setFilter({ answerTypeId: e.target.value })}
                        >
                            <option value="">ყველა</option>
                            {lookups.answerTypes.map((item) => (
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
                            onClick={() =>
                                setFilter({
                                    studentContractId: "",
                                    dateFrom: "",
                                    dateTo: "",
                                    callTypeId: "",
                                    answerTypeId: "",
                                })
                            }
                        >
                            ფილტრის მოხსნა
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
                gridHeader="CRM ზარები"
                showCountColumn
                columns={crmCallColumns}
                rowsData={rangeInvalid ? undefined : rowsData}
                loading={isFetching}
                allowCreate
                editorLink={crmCallEditUrl()}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
        </div>
    );
};

export default CrmCalls;
