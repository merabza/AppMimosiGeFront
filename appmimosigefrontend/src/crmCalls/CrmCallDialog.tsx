//CrmCallDialog.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import {
    useCreateCrmCallMutation,
    useGetCrmCallFormLookupsQuery,
    useGetCrmCallsRowsDataQuery,
} from "../redux/api/crmCallsApi";
import type { ICrmCallRow } from "../redux/types/crmCallsTypes";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import CrmCallFields from "./CrmCallFields";
import {
    crmCallFormToRequest,
    type ICrmCallForm,
    newCrmCallForm,
    nowDateTimeInputValue,
} from "./crmCallForm";
import { contractCrmCallsUrl, shortenText } from "./crmCallsListFilter";

//ზარების ისტორიაში ნაჩვენები ბოლო ზარების რაოდენობა
export const historyRowsCount = 5;

export interface ICrmCallDialogContract {
    studentContractId: number;
    academicYearId: number;
    //"გვარი სახელი / ნომერი"
    name: string;
}

type CrmCallDialogProps = {
    contract: ICrmCallDialogContract;
    onClose: () => void;
    //ზარი შეინახა: ბალანსების სია თავიდან უნდა ჩაიტვირთოს ("უნდა გადაიხადოს" შეიძლება შეიცვალა)
    onSaved: () => void;
};

//ბალანსების (დეპოზიტების) სტრიქონის "ზარი" (Access-ის cmdOpenCRMCalls): ახალი ზარი ამ კონტრაქტზე ნაგულისხმევი
//ტიპით და კონტრაქტის ბოლო ზარები
const CrmCallDialog: FC<CrmCallDialogProps> = ({ contract, onClose, onSaved }) => {
    const dispatch = useAppDispatch();
    const { data: lookups } = useGetCrmCallFormLookupsQuery();
    const { data: history, isFetching: historyLoading } = useGetCrmCallsRowsDataQuery({
        offset: 0,
        rowsCount: historyRowsCount,
        filterFields: [
            { fieldName: "studentContractId", value: contract.studentContractId.toString() },
        ],
        sortByFields: [{ fieldName: "callDate", ascending: false }],
    });
    const [createCrmCall, { isLoading: saving }] = useCreateCrmCallMutation();
    const [form, setForm] = useState<ICrmCallForm>(() =>
        newCrmCallForm(
            nowDateTimeInputValue(),
            contract.academicYearId.toString(),
            contract.studentContractId.toString()
        )
    );

    //ზარის შეცდომა მხოლოდ ფანჯარაშია: დახურვის შემდეგ გვერდის შეტყობინებებში აღარ რჩება
    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        return () => {
            dispatch(clearAlert(EAlertKind.ApiMutation));
        };
    }, [dispatch]);

    const setField = <K extends keyof ICrmCallForm>(field: K, value: ICrmCallForm[K]) =>
        setForm((f) => ({ ...f, [field]: value }));

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await createCrmCall(crmCallFormToRequest(form)).unwrap();
            onSaved();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ფანჯარაში ჩანს
        }
    }

    return (
        <Modal show size="lg" onHide={onClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>ზარი: {contract.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {lookups ? (
                        <CrmCallFields
                            form={form}
                            callTypes={lookups.callTypes}
                            answerTypes={lookups.answerTypes}
                            onChange={setField}
                        />
                    ) : (
                        <Loading />
                    )}
                    <AlertMessages alertKind={EAlertKind.ApiMutation} />
                    <h6 className="mt-3">ბოლო ზარები</h6>
                    {historyLoading || !history ? (
                        <Loading />
                    ) : (
                        <CrmCallsHistory
                            rows={history.rows}
                            allRowsCount={history.allRowsCount}
                            allCallsUrl={contractCrmCallsUrl(
                                contract.studentContractId,
                                contract.academicYearId
                            )}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>
                        <FontAwesomeIcon icon="window-close" /> დახურვა
                    </Button>
                    <Button type="submit" disabled={saving || !lookups}>
                        <FontAwesomeIcon icon="save" /> შენახვა
                        {saving && <Spinner size="sm" animation="border" />}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

type CrmCallsHistoryProps = {
    rows: ICrmCallRow[];
    allRowsCount: number;
    allCallsUrl: string;
};

const CrmCallsHistory: FC<CrmCallsHistoryProps> = ({ rows, allRowsCount, allCallsUrl }) => {
    if (rows.length === 0) return <div>ამ კონტრაქტზე ზარი ჯერ არ ყოფილა</div>;
    return (
        <>
            <Table bordered size="sm" data-testid="crmCallsHistory">
                <thead>
                    <tr>
                        <th>თარიღი</th>
                        <th>შედეგი</th>
                        <th>საუბარი</th>
                        <th>უნდა გადაიხადოს</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <td>{formatDateTime(row.callDate)}</td>
                            <td>{row.answerTypeName}</td>
                            <td title={row.callConversation ?? ""}>
                                {shortenText(row.callConversation)}
                            </td>
                            <td>{formatDate(row.mustPayDate)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            {allRowsCount > rows.length && (
                <Link to={allCallsUrl}>ყველა ზარი ({allRowsCount})</Link>
            )}
        </>
    );
};

export default CrmCallDialog;
