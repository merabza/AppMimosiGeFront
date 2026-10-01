//Lessons.tsx

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
    useGetLessonFormLookupsQuery,
    useLazyGetLessonsRowsDataQuery,
} from "../redux/api/lessonsApi";
import type { ILessonRow } from "../redux/types/lessonsTypes";
import { formatDateTime } from "../studentContracts/dateFormat";
import {
    lessonEditRoute,
    lessonEditUrl,
    useHasLessonsRight,
} from "./lessonsMenu";
import {
    buildLessonsFilterFields,
    currentMonth,
    currentWeek,
    filterFromSearchParams,
    filterToSearchParams,
    isDateRangeInvalid,
    type ILessonsListFilter,
} from "./lessonsListFilter";

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

const columns: IGridColumn[] = [
    column(
        "lessonDt",
        "თარიღი და დრო",
        <CustomColumn
            onGetCell={(value, record) => (
                <Link to={lessonEditUrl((record as ILessonRow).lessonId)}>
                    {formatDateTime(value)}
                </Link>
            )}
        />
    ),
    column("groupCode", "ჯგუფი"),
    column("courseName", "საგანი"),
    column("teacherName", "მასწავლებელი"),
    column("substituteTeacherName", "შემცვლელი"),
    column("lessonStatusName", "სტატუსი"),
    column("studentsCount", "მოსწავლეები"),
    column("presentCount", "დამსწრეები"),
    { ...column("lessonId", "ID"), isKey: true, sortable: false },
];

//Access-ის FrmLessons-ის ნაცვლად: გაკვეთილების სია ფილტრით, საიდანაც ჟურნალი (გაკვეთილის ფორმა) იხსნება
const Lessons: FC = () => {
    const hasRight = useHasLessonsRight();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetLessonFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetLessonsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();

    const filter = useMemo(
        () => filterFromSearchParams(searchParams),
        [searchParams]
    );
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
                filterFields: buildLessonsFilterFields(filter),
            });
        },
        [getRowsData, filter, rangeInvalid]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება
    useEffect(() => {
        if (hasRight) load({ ...gridState.current, offset: 0 });
    }, [load, hasRight]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>გაკვეთილების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<ILessonsListFilter>) =>
        setSearchParams(filterToSearchParams({ ...filter, ...changes }), {
            replace: true,
        });

    const lookupFilter = (
        id: string,
        field: "grpId" | "teacherContractId" | "lessonStatusId",
        caption: string,
        items: { id: number; name: string }[]
    ) => (
        <Col sm="3">
            <Form.Label htmlFor={id}>{caption}</Form.Label>
            <Form.Select
                id={id}
                value={filter[field]}
                onChange={(e) => setFilter({ [field]: e.target.value })}
            >
                <option value="">ყველა</option>
                {items.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </Form.Select>
        </Col>
    );

    return (
        <div>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
                    {lookupFilter("filterGroup", "grpId", "ჯგუფი", lookups.groups)}
                    {lookupFilter(
                        "filterTeacher",
                        "teacherContractId",
                        "მასწავლებელი ან შემცვლელი",
                        lookups.teacherContracts
                    )}
                    {lookupFilter(
                        "filterStatus",
                        "lessonStatusId",
                        "სტატუსი",
                        lookups.lessonStatuses
                    )}
                    <Col sm="3" className="d-flex align-items-end">
                        <Form.Check
                            id="filterUnfilled"
                            type="checkbox"
                            label="შეუვსებელი (დასწრება არ არის მონიშნული)"
                            checked={filter.unfilled}
                            onChange={(e) =>
                                setFilter({ unfilled: e.target.checked })
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
                            onClick={() => setFilter(currentWeek())}
                        >
                            ეს კვირა
                        </Button>
                        <Button
                            variant="outline-secondary"
                            className="me-2"
                            onClick={() => setFilter(currentMonth())}
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
                gridHeader="გაკვეთილები"
                showCountColumn
                columns={columns}
                rowsData={rangeInvalid ? undefined : rowsData}
                loading={isFetching}
                editorLink={`/${lessonEditRoute}`}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
        </div>
    );
};

export default Lessons;
