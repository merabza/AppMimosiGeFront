//TeacherContracts.tsx

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
import { useLazyGetTeacherContractsRowsDataQuery } from "../redux/api/teacherContractsApi";
import type { ITeacherContractRow } from "../redux/types/teacherContractsTypes";
import { formatDate } from "../studentContracts/dateFormat";
import {
    teacherContractEditRoute,
    useHasTeacherContractsRight,
} from "./teacherContractsMenu";
import { buildFilterFields } from "./teacherContractsListFilter";

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

const checkMark = (value: unknown) => (value ? "✓" : "");

const columns: IGridColumn[] = [
    column(
        "contractNumber",
        "კ. N",
        <CustomColumn
            onGetCell={(value, record) => (
                <Link
                    to={`/${teacherContractEditRoute}/${(record as ITeacherContractRow).id}`}
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
    column("teacherName", "თანამშრომელი"),
    column("salarySchemeName", "ხელფასის სქემა"),
    column(
        "pensionScheme",
        "საპენსიო",
        <CustomColumn onGetCell={checkMark} />
    ),
    column("indEnt", "ინდ. მეწარმე", <CustomColumn onGetCell={checkMark} />),
    column(
        "fixedAmount",
        "ფიქს. თანხა",
        <CustomColumn
            onGetCell={(value) => (value ? Number(value).toFixed(2) : "")}
        />
    ),
    column(
        "contractEndDate",
        "დასრულება",
        <CustomColumn onGetCell={(value) => formatDate(value)} />
    ),
    //GridView-ს გასაღები სვეტი სჭირდება
    { ...column("id", "ID", null, true), visible: false, sortable: false },
];

const TeacherContracts: FC = () => {
    const hasRight = useHasTeacherContractsRight();
    const [getRowsData, { data: rowsData, isFetching }] =
        useLazyGetTeacherContractsRowsDataQuery();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    //ნაგულისხმევად მხოლოდ აქტიური კონტრაქტები ჩანს
    const [activeOnly, setActiveOnly] = useState(true);
    const [search, setSearch] = useState("");
    const gridState = useRef<IGridState>({
        offset: 0,
        rowsCount: 10,
        sortByFields: [],
    });

    const load = useCallback(
        (state: IGridState) => {
            gridState.current = state;
            if (!hasRight) return;
            getRowsData({
                ...state,
                filterFields: buildFilterFields(activeOnly, search),
            });
        },
        [getRowsData, hasRight, activeOnly, search]
    );

    //ფილტრის შეცვლისას სია პირველი გვერდიდან იტვირთება, ძებნა კი აკრეფის დასრულებისას
    useEffect(() => {
        const timer = setTimeout(
            () => load({ ...gridState.current, offset: 0 }),
            300
        );
        return () => clearTimeout(timer);
    }, [load]);

    if (hasRight === undefined) return <Loading />;

    if (!hasRight)
        return <h5>მასწავლებლების კონტრაქტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
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
                        <Form.Label htmlFor="filterActive">
                            კონტრაქტები
                        </Form.Label>
                        <Form.Select
                            id="filterActive"
                            value={activeOnly ? "active" : "all"}
                            onChange={(e) =>
                                setActiveOnly(e.target.value === "active")
                            }
                        >
                            <option value="active">აქტიური</option>
                            <option value="all">ყველა</option>
                        </Form.Select>
                    </Col>
                    <Col sm="4">
                        <Form.Label htmlFor="filterSearch">ძებნა</Form.Label>
                        <Form.Control
                            id="filterSearch"
                            placeholder="ნომერი, თანამშრომლის გვარი, სახელი"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </Col>
                </Row>
            </Form>
            <GridView
                gridHeader="მასწავლებლების კონტრაქტები"
                showCountColumn
                columns={columns}
                rowsData={rowsData}
                loading={isFetching}
                allowCreate
                editorLink={`/${teacherContractEditRoute}`}
                onLoadRows={(offset, rowsCount, sortByFields) =>
                    load({ offset, rowsCount, sortByFields })
                }
            />
        </div>
    );
};

export default TeacherContracts;
