//Reports.tsx

import { useEffect, useMemo, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import AlertMessages from "../appcarcass/common/AlertMessages";
import Loading from "../appcarcass/common/Loading";
import { useAlert } from "../appcarcass/hooks/useAlert";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import {
    useDownloadReportExcelMutation,
    useGetReportCatalogQuery,
    useGetReportLookupsQuery,
    useLazyGetReportQuery,
} from "../redux/api/reportsApi";
import type {
    IReportInfo,
    IReportLookups,
    IReportParameterInfo,
    ReportParameterName,
} from "../redux/types/reportsTypes";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import LookupPicker from "./LookupPicker";
import ReportView from "./ReportView";
import { useHasReportsRight } from "./reportsMenu";
import {
    allAcademicYears,
    excelFileName,
    isPeriodInvalid,
    missingRequiredCaption,
    reportQueryString,
    reportsOfCategory,
    resolveAcademicYear,
    selectedOrFirst,
    stateFromSearchParams,
    stateToSearchParams,
    type IReportsPageState,
} from "./reportsForm";
import { useGetAcademicYearsQuery } from "../redux/api/academicYearApi";
import { useDefaultAcademicYearId } from "../academicYear/academicYearChoice";
import "./reports.css";

//პარამეტრები, რომლებსაც ჩამოსაშლელი სია სჭირდება
const lookupParameters: ReportParameterName[] = ["teacherId", "courseId", "studentId"];

function lookupItems(name: ReportParameterName, lookups?: IReportLookups): ILookupItem[] {
    if (!lookups) return [];
    if (name === "teacherId") return lookups.teachers;
    if (name === "courseId") return lookups.courses;
    return lookups.students;
}

function usesAcademicYear(report?: IReportInfo): boolean {
    return report?.parameters.some((p) => p.name === "academicYearId") ?? false;
}

function needsLookups(report?: IReportInfo): boolean {
    return report?.parameters.some((p) => lookupParameters.includes(p.name)) ?? false;
}

//Access-ის FrmMain: კატეგორიის და მისი რეპორტების ჩამოსაშლელი სიები, არჩეული რეპორტის ფილტრები (მხოლოდ მისი პარამეტრები),
//"ნახვა", "ბეჭდვა" და "Excel". კატეგორია, რეპორტი და ფილტრები ბმულშია; შედეგი "ნახვა"-ზე იტვირთება
const Reports: FC = () => {
    const dispatch = useAppDispatch();
    const hasRight = useHasReportsRight();
    const { data: catalog, isLoading: catalogLoading } = useGetReportCatalogQuery(undefined, { skip: !hasRight });
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();
    const state = useMemo(() => stateFromSearchParams(searchParams), [searchParams]);
    const [getReport, { data: report, isFetching: reportFetching, originalArgs }] = useLazyGetReportQuery();
    const [downloadExcel, { isLoading: downloading }] = useDownloadReportExcelMutation();

    const category = catalog ? selectedOrFirst(catalog.categories, state.categoryKey) : undefined;
    const reports = catalog && category ? reportsOfCategory(catalog, category.key) : [];
    const selected = selectedOrFirst(reports, state.reportKey);
    const { data: lookups } = useGetReportLookupsQuery(undefined, { skip: !hasRight || !needsLookups(selected) });
    //შემოწმების რეპორტების წელი: გლობალურად არჩეული (ზედა მენიუ) ან მიმდინარე (ნაწილი 20)
    const { data: academicYears } = useGetAcademicYearsQuery(undefined, {
        skip: !hasRight || !usesAcademicYear(selected),
    });
    const defaultAcademicYearId = useDefaultAcademicYearId(academicYears);

    //სხვა გვერდის დარჩენილი შეცდომა აქ არ უნდა ჩანდეს
    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch]);

    if (hasRight === undefined || catalogLoading) return <Loading />;

    if (!hasRight) return <h5>რეპორტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !catalog)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    //მენიუს უფლება აქვს, მაგრამ არცერთი რეპორტის სპეციალური უფლება
    if (!selected || !category) return <h5>რეპორტების ნახვის უფლება არ გაქვთ</h5>;

    const setState = (changes: Partial<IReportsPageState>) =>
        setSearchParams(stateToSearchParams({ ...state, ...changes }), { replace: true });

    const setParameter = (name: ReportParameterName, value: string) =>
        setState({ parameters: { ...state.parameters, [name]: value } });

    const parameters = resolveAcademicYear(state.parameters, defaultAcademicYearId);
    const missing = missingRequiredCaption(selected, state.parameters);
    const periodInvalid = isPeriodInvalid(selected, state.parameters);
    const canRun = missing === null && !periodInvalid;
    //შედეგი ჩანს, სანამ სხვა რეპორტი არ აირჩევა
    const shown = report && originalArgs?.key === selected.key ? report : undefined;

    function view(report: IReportInfo) {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        getReport({ key: report.key, query: reportQueryString(report, parameters) });
    }

    async function excel(report: IReportInfo) {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await downloadExcel({
                key: report.key,
                query: reportQueryString(report, parameters),
                fileName: excelFileName(report, parameters),
            }).unwrap();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    function parameterInput(parameter: IReportParameterInfo) {
        const id = `reportParameter-${parameter.name}`;
        if (parameter.name === "academicYearId")
            return (
                <Form.Group key={parameter.name} className="mb-2">
                    <Form.Label htmlFor={id}>{parameter.caption}</Form.Label>
                    <Form.Select
                        id={id}
                        value={
                            state.parameters.academicYearId === ""
                                ? (defaultAcademicYearId?.toString() ?? allAcademicYears)
                                : state.parameters.academicYearId
                        }
                        onChange={(e) => setParameter(parameter.name, e.target.value)}
                    >
                        <option value={allAcademicYears}>ყველა</option>
                        {academicYears?.academicYears.map((ay) => (
                            <option key={ay.id} value={ay.id}>
                                {ay.name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            );
        if (lookupParameters.includes(parameter.name))
            return (
                <LookupPicker
                    key={parameter.name}
                    id={id}
                    label={parameter.caption}
                    items={lookupItems(parameter.name, lookups)}
                    value={state.parameters[parameter.name]}
                    onChange={(value) => setParameter(parameter.name, value)}
                />
            );
        return (
            <Form.Group key={parameter.name} className="mb-2">
                <Form.Label htmlFor={id}>{parameter.caption}</Form.Label>
                <Form.Control
                    id={id}
                    type="date"
                    required={parameter.required}
                    value={state.parameters[parameter.name]}
                    onChange={(e) => setParameter(parameter.name, e.target.value)}
                />
            </Form.Group>
        );
    }

    return (
        <div>
            <Row className="no-print">
                <Col md="5">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="reportCategory">კატეგორია</Form.Label>
                        <Form.Select
                            id="reportCategory"
                            value={category.key}
                            onChange={(e) => setState({ categoryKey: e.target.value, reportKey: "" })}
                        >
                            {catalog.categories.map((c) => (
                                <option key={c.key} value={c.key}>
                                    {c.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="reportKey">რეპორტი</Form.Label>
                        <Form.Select
                            id="reportKey"
                            value={selected.key}
                            onChange={(e) => setState({ categoryKey: category.key, reportKey: e.target.value })}
                        >
                            {reports.map((r) => (
                                <option key={r.key} value={r.key}>
                                    {r.title}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md="7">
                    <h6>{selected.title}</h6>
                    {selected.description && <p className="text-muted small">{selected.description}</p>}
                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (canRun) view(selected);
                        }}
                    >
                        {selected.parameters.map(parameterInput)}
                        <div className="d-flex flex-wrap gap-2">
                            <Button type="submit" disabled={!canRun || reportFetching}>
                                ნახვა
                                {reportFetching && <Spinner size="sm" animation="border" className="ms-1" />}
                            </Button>
                            <Button
                                variant="outline-primary"
                                disabled={!shown || reportFetching}
                                onClick={() => window.print()}
                            >
                                ბეჭდვა
                            </Button>
                            <Button
                                variant="outline-success"
                                disabled={!canRun || downloading}
                                onClick={() => excel(selected)}
                            >
                                Excel
                                {downloading && <Spinner size="sm" animation="border" className="ms-1" />}
                            </Button>
                        </div>
                    </Form>
                </Col>
            </Row>
            <div className="no-print">
                {missing !== null && <Alert variant="warning">{`„${missing}" შევსებული უნდა იყოს`}</Alert>}
                {periodInvalid && <Alert variant="warning">„თარიღიდან" „თარიღამდე"-ზე გვიან არის</Alert>}
                <AlertMessages alertKind={EAlertKind.ApiMutation} />
            </div>
            {reportFetching ? <Loading /> : shown && <ReportView report={shown} />}
        </div>
    );
};

export default Reports;
