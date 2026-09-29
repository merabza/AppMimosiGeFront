//StudentContracts.tsx

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
    useGetStudentContractFormLookupsQuery,
    useLazyGetStudentContractsRowsDataQuery,
} from "../redux/api/studentContractsApi";
import type { IStudentContractRow } from "../redux/types/studentContractsTypes";
import {
    studentContractEditRoute,
    useHasStudentContractsRight,
} from "./studentContractsMenu";
import { formatDate } from "./dateFormat";
import { buildFilterFields } from "./studentContractsListFilter";

interface IGridState {
    offset: number;
    rowsCount: number;
    sortByFields: ISortField[];
}

function column(
    fieldName: string,
    caption: string,
    control: React.ReactNode | null = null,
    isKey = false
): IGridColumn {
    return {
        caption,
        visible: true,
        sortable: true,
        nullable: true,
        fieldName,
        isKey,
        control,
        changingFieldName: "",
        typeName: "",
    };
}

const columns: IGridColumn[] = [
    column(
        "contractNumber",
        "კ. N",
        <CustomColumn
            onGetCell={(value, record) => (
                <Link
                    to={`/${studentContractEditRoute}/${(record as IStudentContractRow).scId}`}
                >
                    {value}
                </Link>
            )}
        />
    ),
    column(
        "contractDate",
        "თარიღი",
        <CustomColumn onGetCell={(value) => formatDate(value)} />
    ),
    column("studentName", "მოსწავლე"),
    column("payerName", "გადამხდელი"),
    column("academicYearName", "სასწ. წელი"),
    column("studentStatusName", "მოსწ. სტატ."),
    column("desiredMonthlyPaymentDay", "გადახდის სასურველი დღე"),
    //GridView-ს გასაღები სვეტი სჭირდება
    { ...column("scId", "ID", null, true), visible: false, sortable: false },
];

const StudentContracts: FC = () => {
    const hasRight = useHasStudentContractsRight();
    const { data: lookups, isLoading: lookupsLoading } =
        useGetStudentContractFormLookupsQuery(undefined, { skip: !hasRight });
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetStudentContractsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    //null: ნაგულისხმევი (მიმდინარე) წელი ჯერ არ დაყენებულა
    const [academicYearId, setAcademicYearId] = useState<string | null>(null);
    const [studentStatusId, setStudentStatusId] = useState("");
    const [search, setSearch] = useState("");
    const gridState = useRef<IGridState>({
        offset: 0,
        rowsCount: 10,
        sortByFields: [],
    });

    useEffect(() => {
        if (lookups && academicYearId === null)
            setAcademicYearId(lookups.currentAcademicYearId?.toString() ?? "");
    }, [lookups, academicYearId]);

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (academicYearId === null) return;
            getRowsData({
                ...state,
                filterFields: buildFilterFields(
                    academicYearId,
                    studentStatusId,
                    search
                ),
            });
        },
        [getRowsData, academicYearId, studentStatusId, search]
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

    if (!hasRight)
        return <h5>მოსწავლეების კონტრაქტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    return (
        <div>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
                    <Col sm="3">
                        <Form.Label htmlFor="filterAcademicYear">
                            სასწავლო წელი
                        </Form.Label>
                        <Form.Select
                            id="filterAcademicYear"
                            value={academicYearId ?? ""}
                            onChange={(e) => setAcademicYearId(e.target.value)}
                        >
                            <option value="">ყველა</option>
                            {lookups.academicYears.map((ay) => (
                                <option key={ay.id} value={ay.id}>
                                    {ay.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col sm="3">
                        <Form.Label htmlFor="filterStudentStatus">
                            მოსწავლის სტატუსი
                        </Form.Label>
                        <Form.Select
                            id="filterStudentStatus"
                            value={studentStatusId}
                            onChange={(e) => setStudentStatusId(e.target.value)}
                        >
                            <option value="">ყველა</option>
                            {lookups.studentStatuses.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col sm="4">
                        <Form.Label htmlFor="filterSearch">ძებნა</Form.Label>
                        <Form.Control
                            id="filterSearch"
                            placeholder="ნომერი, მოსწავლის ან გადამხდელის გვარი, სახელი"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </Col>
                </Row>
            </Form>
            <GridView
                gridHeader="მოსწავლეების კონტრაქტები"
                showCountColumn
                columns={columns}
                rowsData={rowsData}
                loading={isFetching}
                allowCreate
                editorLink={`/${studentContractEditRoute}`}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
        </div>
    );
};

export default StudentContracts;
