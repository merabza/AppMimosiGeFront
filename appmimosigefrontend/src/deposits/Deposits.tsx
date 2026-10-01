//Deposits.tsx

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { Alert, Button, ButtonGroup, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query/react";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useFullRecountBalancesMutation,
    useGetDepositsFormLookupsQuery,
    useGetDepositsQuery,
    useRecountBalancesMutation,
} from "../redux/api/depositsApi";
import type {
    DepositsFilterMode,
    IBalancesRecount,
    IDepositRow,
} from "../redux/types/balancesTypes";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import { formatAmount } from "../payments/paymentsListFilter";
import { statementUrl } from "../chargesAndPayments/statementFilter";
import { useCanRecountAllGroupsLessons } from "../lessonGenerator/lessonGeneration";
import { useHasDepositsRight } from "./depositsMenu";
import { useHasCrmCallsRight } from "../crmCalls/crmCallsMenu";
import CrmCallDialog, { type ICrmCallDialogContract } from "../crmCalls/CrmCallDialog";
import {
    allAcademicYears,
    filterFromSearchParams,
    filterToSearchParams,
    formatPhone,
    toDepositsRequest,
    type IDepositsFilter,
} from "./depositsFilter";

//გადაანგარიშების შედეგი ერთ ხაზად
function recountSummary(result: IBalancesRecount): string {
    const errors =
        result.groupErrorsCount > 0
            ? `, გენერატორის შეცდომები: ${result.groupErrorsCount} (გენერატორის ლოგშია)`
            : "";
    return (
        `გადაითვალა: ჯგუფები ${result.groupsCount} (შეიცვალა ${result.changedGroupsCount}), ` +
        `კონტრაქტები ${result.studentContractsCount} (შეიცვალა ${result.changedNextPayDatesCount})${errors}`
    );
}

const filterButtons: { mode: DepositsFilterMode; caption: string }[] = [
    { mode: "filter", caption: "ფილტრი" },
    { mode: "call", caption: "დარეკვის ფილტრი" },
    { mode: "", caption: "ფილტრის მოხსნა" },
];

//Access-ის FrmDeposites: კონტრაქტები, რომელთა ბალანსი "მაქსიმუმზე" ნაკლებია ან სასურველ დღეზე გადასახდელი აქვთ.
//გახსნისას ჯერ dirty ჯგუფების გაკვეთილები და dirty კონტრაქტების შემდეგი გადახდის თარიღი გადაითვლება
const Deposits: FC = () => {
    const hasRight = useHasDepositsRight();
    const canFullRecount = useCanRecountAllGroupsLessons();
    //"ზარი" მხოლოდ CRM ზარების უფლებით ჩანს: ზარს CRM-ის endpoint-ები ინახავს
    const canCall = useHasCrmCallsRight() === true;
    const [callContract, setCallContract] = useState<ICrmCallDialogContract | null>(null);
    const { data: lookups, isLoading: lookupsLoading } =
        useGetDepositsFormLookupsQuery(undefined, { skip: !hasRight });
    const [recount, { data: recountResult }] = useRecountBalancesMutation();
    const [fullRecount, { data: fullRecountResult, isLoading: fullRecounting }] =
        useFullRecountBalancesMutation();
    const [recounted, setRecounted] = useState(false);
    const recountStarted = useRef(false);
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();

    const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams]);
    //სია გადაანგარიშების შემდეგ იტვირთება; მიმდინარე წელს ცნობარები იძლევა
    const { data: deposits, isFetching, refetch } = useGetDepositsQuery(
        hasRight && recounted && lookups
            ? toDepositsRequest(filter, lookups.currentAcademicYearId)
            : skipToken
    );

    //ერთხელ, მონაცემების ჩატვირთვამდე (StrictMode-ში ეფექტი ორჯერ ეშვება); შეცდომისასაც სია იტვირთება
    useEffect(() => {
        if (!hasRight || recountStarted.current) return;
        recountStarted.current = true;
        recount()
            .unwrap()
            .catch(() => undefined)
            .finally(() => setRecounted(true));
    }, [hasRight, recount]);

    if (hasRight === undefined || lookupsLoading) return <Loading />;

    if (!hasRight) return <h5>დეპოზიტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors || !lookups)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<IDepositsFilter>) =>
        setSearchParams(filterToSearchParams({ ...filter, ...changes }), { replace: true });

    const lastRecount = fullRecountResult ?? recountResult;

    return (
        <div>
            <h4>დეპოზიტები</h4>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
                    <Col sm="2">
                        <Form.Label htmlFor="filterAcademicYear">სასწავლო წელი</Form.Label>
                        <Form.Select
                            id="filterAcademicYear"
                            value={
                                filter.academicYearId === ""
                                    ? (lookups.currentAcademicYearId?.toString() ?? allAcademicYears)
                                    : filter.academicYearId
                            }
                            onChange={(e) => setFilter({ academicYearId: e.target.value })}
                        >
                            <option value={allAcademicYears}>ყველა</option>
                            {lookups.academicYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col sm="2">
                        <Form.Label htmlFor="filterMaximum">მაქსიმუმი</Form.Label>
                        <Form.Control
                            id="filterMaximum"
                            type="number"
                            step="any"
                            value={filter.maximum}
                            onChange={(e) => setFilter({ maximum: e.target.value })}
                        />
                    </Col>
                    <Col sm="2">
                        <Form.Label htmlFor="filterDateTo">თარიღამდე</Form.Label>
                        <Form.Control
                            id="filterDateTo"
                            type="date"
                            required
                            value={filter.dateTo}
                            onChange={(e) => {
                                //ცარიელი თარიღით სია არ ითვლება
                                if (e.target.value !== "") setFilter({ dateTo: e.target.value });
                            }}
                        />
                    </Col>
                    <Col sm="6" className="d-flex align-items-end">
                        <ButtonGroup className="me-2">
                            {filterButtons.map((button) => (
                                <Button
                                    key={button.mode}
                                    variant={
                                        filter.filter === button.mode && button.mode !== ""
                                            ? "primary"
                                            : "outline-secondary"
                                    }
                                    onClick={() => setFilter({ filter: button.mode })}
                                >
                                    {button.caption}
                                </Button>
                            ))}
                        </ButtonGroup>
                        {canFullRecount && (
                            <Button
                                variant="outline-danger"
                                disabled={!recounted || fullRecounting}
                                onClick={() => fullRecount()}
                            >
                                {fullRecounting && <Spinner size="sm" className="me-1" />}
                                სრული გადაანგარიშება
                            </Button>
                        )}
                    </Col>
                </Row>
            </Form>
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
            {!recounted && (
                <Alert variant="info">
                    <Spinner size="sm" className="me-2" />
                    გაკვეთილები და შემდეგი გადახდის თარიღები გადაითვლება...
                </Alert>
            )}
            {lastRecount && (
                <div className="text-muted small mb-2" data-testid="recountSummary">
                    {recountSummary(lastRecount)}
                </div>
            )}
            {recounted && (isFetching || !deposits) && <Loading />}
            {recounted && !isFetching && deposits && (
                <DepositsTable
                    rows={deposits.rows}
                    dateTo={filter.dateTo}
                    totalBalance={deposits.totalBalance}
                    totalFourWeekFee={deposits.totalFourWeekFee}
                    onCall={canCall ? setCallContract : undefined}
                />
            )}
            {callContract && (
                <CrmCallDialog
                    contract={callContract}
                    onClose={() => setCallContract(null)}
                    onSaved={() => {
                        setCallContract(null);
                        //"უნდა გადაიხადოს" ბაზიდან იკითხება, გადაანგარიშება არ სჭირდება
                        refetch();
                    }}
                />
            )}
        </div>
    );
};

type DepositsTableProps = {
    rows: IDepositRow[];
    dateTo: string;
    totalBalance: number;
    totalFourWeekFee: number;
    //CRM ზარების უფლების გარეშე undefined: "ზარი" არ ჩანს
    onCall?: (contract: ICrmCallDialogContract) => void;
};

const DepositsTable: FC<DepositsTableProps> = ({
    rows,
    dateTo,
    totalBalance,
    totalFourWeekFee,
    onCall,
}) => {
    if (rows.length === 0) return <div>მონაცემები არ არის</div>;
    return (
        <Table striped bordered hover responsive size="sm">
            <thead>
                <tr>
                    <th>მოსწავლე</th>
                    <th>კონტრ.</th>
                    <th>ბალანსი</th>
                    <th>ტელეფონი</th>
                    <th>გადამხდელი</th>
                    <th>ტელეფონი</th>
                    <th>შემდეგი გაკვეთილი</th>
                    <th title="CRM: უნდა გადაიხადოს თარიღამდე">უნდა გადაიხადოს</th>
                    <th title="ოთხკვირიანი გადასახადების ჯამი">4 კვ.</th>
                    <th title="გადახდის სასურველი დღე">სას. დღე</th>
                    <th>გად. თარიღი</th>
                    <th>მომდევნო</th>
                    <th title="გადასახდელი მომდევნო გადახდის თარიღამდე">თანხა</th>
                    <th title="შემდეგი გადახდის თარიღი">STOP თარიღი</th>
                    <th title="გადასახდელი სწავლის დასრულებამდე">დასრ. თანხა</th>
                    <th title="დასრულების სავარაუდო თარიღი">დასრულება</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.studentContractId} data-testid={`deposit-${row.studentContractId}`}>
                        <td>{row.studentName}</td>
                        <td>{row.contractNumber}</td>
                        <td className="text-end">{formatAmount(row.balance)}</td>
                        <td>{formatPhone(row.studentPhone)}</td>
                        <td>{row.payerName}</td>
                        <td>{formatPhone(row.payerPhone)}</td>
                        <td>{formatDateTime(row.nextLessonDate)}</td>
                        <td>{formatDate(row.crmMustPayDate)}</td>
                        <td className="text-end">{formatAmount(row.fourWeekFee)}</td>
                        <td>{row.desiredMonthlyPaymentDay ?? ""}</td>
                        <td>{formatDate(row.desiredNextPayDate)}</td>
                        <td>{formatDate(row.desiredAfterNextPayDate)}</td>
                        <td className="text-end">{formatAmount(row.desiredDayAmount)}</td>
                        <td>{formatDateTime(row.stopDate)}</td>
                        <td className="text-end">{formatAmount(row.mustPayToEnd)}</td>
                        <td>{formatDate(row.endDate)}</td>
                        <td>
                            <Link to={statementUrl(row.studentContractId, row.academicYearId, dateTo)}>
                                ამონაწერი
                            </Link>
                            {onCall && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 ms-2 align-baseline"
                                    onClick={() =>
                                        onCall({
                                            studentContractId: row.studentContractId,
                                            academicYearId: row.academicYearId,
                                            name: `${row.studentName} / ${row.contractNumber}`,
                                        })
                                    }
                                >
                                    ზარი
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="fw-bold">
                    <td colSpan={2}>ჯამი</td>
                    <td className="text-end" data-testid="totalBalance">
                        {formatAmount(totalBalance)}
                    </td>
                    <td colSpan={5}></td>
                    <td className="text-end" data-testid="totalFourWeekFee">
                        {formatAmount(totalFourWeekFee)}
                    </td>
                    <td colSpan={8}></td>
                </tr>
            </tfoot>
        </Table>
    );
};

export default Deposits;
