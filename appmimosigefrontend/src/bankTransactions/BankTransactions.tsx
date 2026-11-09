//BankTransactions.tsx

import { useMemo, type FC } from "react";
import { Button, ButtonGroup, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query/react";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetBankTransactionsQuery,
    useImportBankTransactionsMutation,
} from "../redux/api/bankTransactionsApi";
import type {
    BankTransactionsFilterMode,
    IBankTransactionRow,
    IBankTransactionsRequest,
} from "../redux/types/bankTransactionsTypes";
import { formatDate } from "../studentContracts/dateFormat";
import { formatAmount } from "../payments/paymentsListFilter";
import { bankTransactionEditUrl, useHasBankTransactionsRight } from "./bankTransactionsMenu";
import {
    filterFromSearchParams,
    filterToSearchParams,
    importSummary,
    matchStepCaption,
    rowStatus,
} from "./bankTransactionsLogic";

const filterButtons: { mode: BankTransactionsFilterMode; caption: string }[] = [
    { mode: "", caption: "ყველა" },
    { mode: "unallocated", caption: "ბოლომდე გაუნაწილებელი" },
    { mode: "ignored", caption: "არ არის მოსწავლის" },
];

//ბანკიდან მიღებული ჩარიცხვები და მათი განაწილება მოსწავლეებზე (D164): ჩარიცხვას ქმნის მხოლოდ ბანკთან ინტეგრაცია,
//მენეჯერი ხელით ანაწილებს იმას, რაც პროგრამამ ვერ გაანაწილა
const BankTransactions: FC = () => {
    const hasRight = useHasBankTransactionsRight();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams]);
    const { data: rows, isFetching } = useGetBankTransactionsQuery(hasRight ? filter : skipToken);
    const [importTransactions, { data: importResult, isLoading: importing }] =
        useImportBankTransactionsMutation();

    if (hasRight === undefined) return <Loading />;

    if (!hasRight) return <h5>ბანკის ჩარიცხვების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    const setFilter = (changes: Partial<IBankTransactionsRequest>) =>
        setSearchParams(filterToSearchParams({ ...filter, ...changes }), { replace: true });

    return (
        <div>
            <h4>ბანკის ჩარიცხვები</h4>
            <Form className="mb-2" onSubmit={(e) => e.preventDefault()}>
                <Row>
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
                    <Col sm="8" className="d-flex align-items-end">
                        <ButtonGroup className="me-2">
                            {filterButtons.map((button) => (
                                <Button
                                    key={button.mode}
                                    variant={filter.filter === button.mode ? "primary" : "outline-secondary"}
                                    onClick={() => setFilter({ filter: button.mode })}
                                >
                                    {button.caption}
                                </Button>
                            ))}
                        </ButtonGroup>
                        <Button
                            variant="outline-success"
                            disabled={importing}
                            onClick={() => importTransactions()}
                        >
                            {importing && <Spinner size="sm" className="me-1" />}
                            ბანკიდან განახლება
                        </Button>
                    </Col>
                </Row>
            </Form>
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
            {importResult && (
                <div className="text-muted small mb-2" data-testid="importSummary">
                    {importSummary(importResult)}
                </div>
            )}
            {(isFetching || !rows) && <Loading />}
            {!isFetching && rows && <BankTransactionsTable rows={rows} />}
        </div>
    );
};

const BankTransactionsTable: FC<{ rows: IBankTransactionRow[] }> = ({ rows }) => {
    if (rows.length === 0) return <div>მონაცემები არ არის</div>;
    return (
        <Table striped bordered hover responsive size="sm">
            <thead>
                <tr>
                    <th>თარიღი</th>
                    <th>თანხა</th>
                    <th>გადამხდელი</th>
                    <th>დანიშნულება</th>
                    <th title="რომელმა წესმა იპოვა მოსწავლე">მოძებნა</th>
                    <th>განაწილებული</th>
                    <th>მდგომარეობა</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.id} data-testid={`bankTransaction-${row.id}`}>
                        <td>{formatDate(row.transactionDate)}</td>
                        <td className="text-end">{formatAmount(row.amount)}</td>
                        <td>{row.partnerName}</td>
                        <td>{row.purpose}</td>
                        <td>{matchStepCaption(row.matchStep)}</td>
                        <td className="text-end">{formatAmount(row.allocatedAmount)}</td>
                        <td>
                            {rowStatus(row)}
                            {row.hasCheckedPayments && (
                                <span className="ms-1" title="განაწილების გადახდა შემოწმებულია">
                                    ✓
                                </span>
                            )}
                        </td>
                        <td>
                            <Link to={bankTransactionEditUrl(row.id)}>განაწილება</Link>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default BankTransactions;
