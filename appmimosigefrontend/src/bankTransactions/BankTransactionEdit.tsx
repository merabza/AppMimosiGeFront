//BankTransactionEdit.tsx

import { useEffect, useRef, useState, type FC } from "react";
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query/react";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetBankTransactionQuery,
    useGetBankTransactionStudentContractsQuery,
    useSetBankTransactionAllocationMutation,
    useSetBankTransactionIgnoredMutation,
} from "../redux/api/bankTransactionsApi";
import { useGetAcademicYearsQuery } from "../redux/api/academicYearApi";
import type { IBankTransaction } from "../redux/types/bankTransactionsTypes";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import { formatDate } from "../studentContracts/dateFormat";
import { formatAmount } from "../payments/paymentsListFilter";
import StudentContractPicker from "../payments/StudentContractPicker";
import { useDefaultAcademicYearId } from "../academicYear/academicYearChoice";
import { bankTransactionsMenuKey, useHasBankTransactionsRight } from "./bankTransactionsMenu";
import {
    matchStepCaption,
    sharesError,
    sharesFromAllocations,
    sharesTotal,
    toShares,
    type IShareRow,
} from "./bankTransactionsLogic";

//ჩარიცხვის ხელით განაწილება (D164, D168, D169): წილები მოსწავლეების კონტრაქტებზე, ჯამი ჩარიცხულზე მეტი ვერ იქნება.
//შენახვისას ჩარიცხვის გადამხდელი წილების მოსწავლეებს ებმება. შემოწმებული გადახდის მქონე ჩარიცხვა აღარ იცვლება
const BankTransactionEdit: FC = () => {
    const hasRight = useHasBankTransactionsRight();
    const { bankTransactionId } = useParams();
    const id = Number(bankTransactionId);
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    //currentData: შენახვის შემდეგ ხელახლა ჩატვირთვისას რედაქტორი ადგილზე რჩება, სხვა ჩარიცხვის მონაცემი კი არ ჩანს
    const { currentData: bankTransaction } = useGetBankTransactionQuery(
        hasRight && Number.isInteger(id) ? id : skipToken
    );
    const { data: academicYears } = useGetAcademicYearsQuery(undefined, { skip: !hasRight });

    if (hasRight === undefined) return <Loading />;

    if (!hasRight) return <h5>ბანკის ჩარიცხვების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!bankTransaction || !academicYears) return <Loading />;

    return (
        <BankTransactionEditor
            bankTransaction={bankTransaction}
            academicYears={academicYears.academicYears}
            currentAcademicYearId={academicYears.currentAcademicYearId}
        />
    );
};

type EditorProps = {
    bankTransaction: IBankTransaction;
    academicYears: ILookupItem[];
    currentAcademicYearId: number | null;
};

const BankTransactionEditor: FC<EditorProps> = ({ bankTransaction, academicYears, currentAcademicYearId }) => {
    const defaultAcademicYearId = useDefaultAcademicYearId({ academicYears, currentAcademicYearId });
    const [rows, setRows] = useState<IShareRow[]>(() => sharesFromAllocations(bankTransaction.allocations));
    const nextKey = useRef(bankTransaction.allocations.length);
    const [saved, setSaved] = useState(false);
    const [setAllocation, { isLoading: saving }] = useSetBankTransactionAllocationMutation();
    const [setIgnored, { isLoading: settingIgnored }] = useSetBankTransactionIgnoredMutation();

    //ჩარიცხვის ხელახლა ჩატვირთვისას (შენახვის შემდეგ) რედაქტორი სერვერის განაწილებას აჩვენებს
    useEffect(() => {
        setRows(sharesFromAllocations(bankTransaction.allocations));
        nextKey.current = bankTransaction.allocations.length;
    }, [bankTransaction]);

    const locked = bankTransaction.allocations.some((a) => a.checked);
    const readOnly = locked || bankTransaction.ignored;
    const total = sharesTotal(rows);
    const error = sharesError(rows, bankTransaction.amount);

    const changeRow = (key: number, changes: Partial<IShareRow>) => {
        setSaved(false);
        setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    };

    const addRow = () => {
        setSaved(false);
        const remainder = Math.max(0, Math.round((bankTransaction.amount - total) * 100) / 100);
        setRows((current) => [
            ...current,
            {
                key: nextKey.current++,
                academicYearId: defaultAcademicYearId?.toString() ?? academicYears[0]?.id.toString() ?? "",
                studentContractId: "",
                amount: remainder > 0 ? String(remainder) : "",
            },
        ]);
    };

    const save = async () => {
        if (error !== null) return;
        try {
            await setAllocation({ bankTransactionId: bankTransaction.id, shares: toShares(rows) }).unwrap();
            setSaved(true);
        } catch {
            //შეცდომას AlertMessages აჩვენებს (ApiMutation)
        }
    };

    return (
        <div>
            <h4>ბანკის ჩარიცხვის განაწილება</h4>
            <div className="mb-2">
                <Link to={`/${bankTransactionsMenuKey}`}>ჩარიცხვების სია</Link>
            </div>
            <Table bordered size="sm" className="mb-3" style={{ maxWidth: "50rem" }}>
                <tbody>
                    <tr>
                        <th>თარიღი</th>
                        <td>{formatDate(bankTransaction.transactionDate)}</td>
                    </tr>
                    <tr>
                        <th>ბანკი</th>
                        <td>{bankTransaction.bankName}</td>
                    </tr>
                    <tr>
                        <th>თანხა</th>
                        <td data-testid="transactionAmount">
                            {formatAmount(bankTransaction.amount)} {bankTransaction.currency}
                        </td>
                    </tr>
                    <tr>
                        <th>გადამხდელი</th>
                        <td>{bankTransaction.partnerName}</td>
                    </tr>
                    <tr>
                        <th>საიდენტიფიკაციო კოდი</th>
                        <td>{bankTransaction.partnerTaxCode}</td>
                    </tr>
                    <tr>
                        <th>ანგარიში</th>
                        <td>{bankTransaction.partnerAccountIban}</td>
                    </tr>
                    <tr>
                        <th>დანიშნულება</th>
                        <td>{bankTransaction.purpose}</td>
                    </tr>
                    <tr>
                        <th>დამატებითი ინფორმაცია</th>
                        <td>{bankTransaction.additionalInformation}</td>
                    </tr>
                    <tr>
                        <th>მოძებნა</th>
                        <td>
                            {matchStepCaption(bankTransaction.matchStep)}
                            {bankTransaction.allocatedManually && " (შეცვლილია ხელით)"}
                        </td>
                    </tr>
                </tbody>
            </Table>
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
            {locked && (
                <Alert variant="info">განაწილების გადახდა შემოწმებულია: განაწილება აღარ იცვლება</Alert>
            )}
            <Form.Check
                id="ignored"
                className="mb-3"
                label="არ არის მოსწავლის გადახდა"
                checked={bankTransaction.ignored}
                disabled={settingIgnored || bankTransaction.allocations.length > 0}
                title={
                    bankTransaction.allocations.length > 0
                        ? "განაწილებული ჩარიცხვის მოსანიშნად ჯერ განაწილება წაშალეთ"
                        : undefined
                }
                onChange={(e) =>
                    setIgnored({ bankTransactionId: bankTransaction.id, ignored: e.target.checked })
                }
            />
            {!bankTransaction.ignored && (
                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    {rows.map((row, index) => (
                        <div key={row.key} className="d-flex align-items-end gap-2" data-testid={`share-${index}`}>
                            <div className="flex-grow-1">
                                <StudentContractPicker
                                    id={`shareContract${index}`}
                                    label={`მოსწავლე ${index + 1}`}
                                    academicYears={academicYears}
                                    academicYearId={row.academicYearId}
                                    studentContractId={row.studentContractId}
                                    contractName={row.contractName}
                                    required
                                    disabled={readOnly}
                                    onYearChange={(academicYearId) =>
                                        changeRow(row.key, { academicYearId, studentContractId: "" })
                                    }
                                    onContractChange={(studentContractId) =>
                                        changeRow(row.key, { studentContractId })
                                    }
                                    useStudentContracts={useGetBankTransactionStudentContractsQuery}
                                />
                            </div>
                            <Form.Group className="mb-2" style={{ width: "9rem" }}>
                                <Form.Label htmlFor={`shareAmount${index}`}>თანხა</Form.Label>
                                <Form.Control
                                    id={`shareAmount${index}`}
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    required
                                    disabled={readOnly}
                                    value={row.amount}
                                    onChange={(e) => changeRow(row.key, { amount: e.target.value })}
                                />
                            </Form.Group>
                            {!readOnly && (
                                <Button
                                    className="mb-2"
                                    variant="outline-danger"
                                    title="წილის წაშლა"
                                    onClick={() => {
                                        setSaved(false);
                                        setRows((current) => current.filter((r) => r.key !== row.key));
                                    }}
                                >
                                    ×
                                </Button>
                            )}
                        </div>
                    ))}
                    <div className="mb-2" data-testid="sharesTotal">
                        განაწილებული: {formatAmount(total)} · ნაშთი:{" "}
                        {formatAmount(Math.round((bankTransaction.amount - total) * 100) / 100)}
                    </div>
                    {!readOnly && error !== null && rows.length > 0 && (
                        <div className="text-danger mb-2" data-testid="sharesError">
                            {error}
                        </div>
                    )}
                    {!readOnly && (
                        <div className="d-flex gap-2">
                            <Button variant="outline-secondary" onClick={addRow}>
                                მოსწავლის დამატება
                            </Button>
                            <Button type="submit" disabled={saving || error !== null}>
                                {saving && <Spinner size="sm" className="me-1" />}
                                შენახვა
                            </Button>
                        </div>
                    )}
                    {saved && (
                        <div className="text-success mt-2" data-testid="savedMessage">
                            განაწილება შენახულია
                        </div>
                    )}
                </Form>
            )}
        </div>
    );
};

export default BankTransactionEdit;
