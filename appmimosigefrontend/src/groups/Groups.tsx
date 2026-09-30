//Groups.tsx

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
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
    useGetGroupFormLookupsQuery,
    useLazyGetGroupsRowsDataQuery,
} from "../redux/api/groupsApi";
import type {
    GroupFindMethod,
    GroupState,
    IGroupRow,
} from "../redux/types/groupsTypes";
import { formatDate } from "../studentContracts/dateFormat";
import { groupEditRoute, useHasGroupsRight } from "./groupsMenu";
import { buildGroupsFilterFields, type IGroupsListFilter } from "./groupsListFilter";

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

const dateColumn = (fieldName: string, caption: string) =>
    column(
        fieldName,
        caption,
        <CustomColumn onGetCell={(value) => formatDate(value)} />
    );

const groupCodeColumn = column(
    "groupCode",
    "კოდი",
    <CustomColumn
        onGetCell={(value, record) => (
            <Link to={`/${groupEditRoute}/${(record as IGroupRow).grpId}`}>
                {value}
            </Link>
        )}
    />
);

//GridView-ს გასაღები სვეტი სჭირდება: ჯგუფით ძებნისას ჯგუფი, სხვა რეჟიმებში ჯგუფის მასწავლებლის/მოსწავლის სტრიქონი
const keyColumn: IGridColumn = {
    ...column("rowId", "ID"),
    isKey: true,
    visible: false,
    sortable: false,
};

const groupDataColumns = [
    column("courseName", "საგანი"),
    column("groupSizeName", "ზომა"),
];

//სვეტები ძებნის რეჟიმის მიხედვით, როგორც Access-ის cmbFind-ში: ჯგუფით ძებნისას ჯგუფის მონაცემები,
//მასწავლებლით და მოსწავლით ძებნისას ადამიანი, ჯგუფი და ადამიანის პერიოდი ჯგუფში
const columnsByFindMethod: Record<GroupFindMethod, IGridColumn[]> = {
    group: [
        groupCodeColumn,
        ...groupDataColumns,
        column("studentStatusName", "მოსწ. სტატუსი"),
        column("teacherName", "მასწავლებელი დღეს"),
        column("activeStudentsCount", "მოსწავლეები დღეს"),
        dateColumn("voidDate", "გაუქმება"),
        column(
            "dirtyLessons",
            "საჭიროებს გაკვეთილების დაზუსტებას",
            <CustomColumn
                onGetCell={(_, record) =>
                    (record as IGroupRow).dirtyLessons ? "დიახ" : ""
                }
            />
        ),
        column("academicYearName", "სასწ. წელი"),
        keyColumn,
    ],
    teacher: [
        column("teacherName", "მასწავლებელი"),
        groupCodeColumn,
        ...groupDataColumns,
        dateColumn("startDate", "დაწყება"),
        dateColumn("endDate", "დასრულება"),
        keyColumn,
    ],
    student: [
        column("studentName", "მოსწავლე"),
        groupCodeColumn,
        ...groupDataColumns,
        dateColumn("startDate", "დაწყება"),
        dateColumn("endDate", "დასრულება"),
        keyColumn,
    ],
};

const searchPlaceholders: Record<GroupFindMethod, string> = {
    group: "ჯგუფის კოდი",
    teacher: "მასწავლებლის გვარი, სახელი",
    student: "მოსწავლის გვარი, სახელი",
};

//Access-ის FrmGroups-ის ძებნა (cmbFindMethod, cmbFind) ჯგუფების სიად
const Groups: FC = () => {
    const hasRight = useHasGroupsRight();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetGroupFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetGroupsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    //academicYearId null: ნაგულისხმევი (მიმდინარე) წელი ჯერ არ დაყენებულა
    const [filter, setFilter] = useState<
        Omit<IGroupsListFilter, "academicYearId"> & {
            academicYearId: string | null;
        }
    >({
        findMethod: "group",
        academicYearId: null,
        state: "active",
        courseId: "",
        groupSizeId: "",
        studentStatusId: "",
        search: "",
    });
    const gridState = useRef<IGridState>({
        offset: 0,
        rowsCount: 10,
        sortByFields: [],
    });

    useEffect(() => {
        if (lookups && filter.academicYearId === null)
            setFilter((f) => ({
                ...f,
                academicYearId: lookups.currentAcademicYearId?.toString() ?? "",
            }));
    }, [lookups, filter.academicYearId]);

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (filter.academicYearId === null) return;
            getRowsData({
                ...state,
                filterFields: buildGroupsFilterFields({
                    ...filter,
                    academicYearId: filter.academicYearId,
                }),
            });
        },
        [getRowsData, filter]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება, ძებნა კი აკრეფის დასრულებისას
    useEffect(() => {
        const timer = setTimeout(
            () => load({ ...gridState.current, offset: 0 }),
            300
        );
        return () => clearTimeout(timer);
    }, [load]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>ჯგუფების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilterField = (field: keyof IGroupsListFilter, value: string) =>
        setFilter((f) => ({ ...f, [field]: value }));

    const lookupFilter = (
        id: string,
        field: "academicYearId" | "courseId" | "groupSizeId" | "studentStatusId",
        caption: string,
        items: { id: number; name: string }[]
    ) => (
        <Col sm="2">
            <Form.Label htmlFor={id}>{caption}</Form.Label>
            <Form.Select
                id={id}
                value={filter[field] ?? ""}
                onChange={(e) => setFilterField(field, e.target.value)}
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
                    {lookupFilter(
                        "filterAcademicYear",
                        "academicYearId",
                        "სასწავლო წელი",
                        lookups.academicYears
                    )}
                    <Col sm="2">
                        <Form.Label htmlFor="filterState">მდგომარეობა</Form.Label>
                        <Form.Select
                            id="filterState"
                            value={filter.state}
                            onChange={(e) =>
                                setFilterField(
                                    "state",
                                    e.target.value as GroupState
                                )
                            }
                        >
                            <option value="active">აქტიური</option>
                            <option value="voided">გაუქმებული</option>
                            <option value="">ყველა</option>
                        </Form.Select>
                    </Col>
                    {lookupFilter(
                        "filterCourse",
                        "courseId",
                        "საგანი",
                        lookups.courses
                    )}
                    {lookupFilter(
                        "filterGroupSize",
                        "groupSizeId",
                        "ზომა",
                        lookups.groupSizes
                    )}
                    {lookupFilter(
                        "filterStudentStatus",
                        "studentStatusId",
                        "მოსწავლის სტატუსი",
                        lookups.studentStatuses
                    )}
                </Row>
                <Row className="mt-2">
                    <Col sm="2">
                        <Form.Label htmlFor="filterFindMethod">
                            ძებნის რეჟიმი
                        </Form.Label>
                        <Form.Select
                            id="filterFindMethod"
                            value={filter.findMethod}
                            onChange={(e) => {
                                //სხვა რეჟიმს სხვა სვეტები აქვს: ცხრილი თავიდან იხატება, დალაგება კი ნაგულისხმევია
                                gridState.current = {
                                    offset: 0,
                                    rowsCount: 10,
                                    sortByFields: [],
                                };
                                setFilterField("findMethod", e.target.value);
                            }}
                        >
                            <option value="group">ჯგუფით</option>
                            <option value="teacher">მასწავლებლით</option>
                            <option value="student">მოსწავლით</option>
                        </Form.Select>
                    </Col>
                    <Col sm="4">
                        <Form.Label htmlFor="filterSearch">ძებნა</Form.Label>
                        <Form.Control
                            id="filterSearch"
                            placeholder={searchPlaceholders[filter.findMethod]}
                            value={filter.search}
                            onChange={(e) =>
                                setFilterField("search", e.target.value)
                            }
                        />
                    </Col>
                </Row>
            </Form>
            <GridView
                key={filter.findMethod}
                gridHeader="ჯგუფები"
                showCountColumn
                columns={columnsByFindMethod[filter.findMethod]}
                rowsData={rowsData}
                loading={isFetching}
                allowCreate
                editorLink={`/${groupEditRoute}`}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
        </div>
    );
};

export default Groups;
