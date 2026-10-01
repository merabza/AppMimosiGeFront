//CrmCallEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCreateCrmCallMutation,
    useDeleteCrmCallMutation,
    useGetCrmCallFormLookupsQuery,
    useGetCrmCallQuery,
    useGetCrmCallStudentContractsQuery,
    useUpdateCrmCallMutation,
} from "../redux/api/crmCallsApi";
import { formatDateTime } from "../studentContracts/dateFormat";
import StudentContractPicker from "../payments/StudentContractPicker";
import CrmCallFields from "./CrmCallFields";
import {
    crmCallFormToRequest,
    crmCallToForm,
    type ICrmCallForm,
    newCrmCallForm,
    nowDateTimeInputValue,
} from "./crmCallForm";
import { crmCallsMenuKey, useHasCrmCallsRight } from "./crmCallsMenu";

//Access-ის FrmCRMCalls-ის სტრიქონი: მოსწავლის კონტრაქტი, ტიპი, თარიღი, შედეგი, საუბარი, "უნდა გადაიხადოს"
const CrmCallEdit: FC = () => {
    const { crmCallId: crmCallIdParam } = useParams<{ crmCallId: string }>();
    const crmCallId = crmCallIdParam ? Number(crmCallIdParam) : undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const hasRight = useHasCrmCallsRight();

    const { data: lookups } = useGetCrmCallFormLookupsQuery(undefined, {
        skip: !hasRight,
    });
    const { data: crmCall, isFetching: crmCallLoading } = useGetCrmCallQuery(
        crmCallId ?? 0,
        { skip: !hasRight || crmCallId === undefined }
    );
    const [createCrmCall, { isLoading: creating }] = useCreateCrmCallMutation();
    const [updateCrmCall, { isLoading: updating }] = useUpdateCrmCallMutation();
    const [deleteCrmCall, { isLoading: deleting }] = useDeleteCrmCallMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<ICrmCallForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = crmCallId === undefined ? "new" : `edit/${crmCallId}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (crmCallId === undefined) {
            setForm(
                newCrmCallForm(
                    nowDateTimeInputValue(),
                    lookups.currentAcademicYearId?.toString() ?? ""
                )
            );
            setFormKey(currentKey);
        } else if (crmCall && crmCall.id === crmCallId && !crmCallLoading) {
            setForm(crmCallToForm(crmCall));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, lookups, crmCall, crmCallLoading, crmCallId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    if (hasRight === false) return <h5>CRM ზარების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const saving = creating || updating;

    const setField = <K extends keyof ICrmCallForm>(field: K, value: ICrmCallForm[K]) =>
        setForm((f) => (f ? { ...f, [field]: value } : f));

    //სიაზე იმავე ფილტრით დაბრუნება; პირდაპირ გახსნილი ფორმიდან (ისტორიის გარეშე) სიაზე
    function close() {
        if (location.key === "default") navigate(`/${crmCallsMenuKey}`);
        else navigate(-1);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = crmCallFormToRequest(form);
        try {
            if (crmCallId === undefined) await createCrmCall(request).unwrap();
            else await updateCrmCall({ crmCallId, request }).unwrap();
            close();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (crmCallId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteCrmCall(crmCallId).unwrap();
            close();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>{crmCallId === undefined ? "ახალი ზარი" : "ზარი"}</h5>
                </Col>
                <Col sm="4" className="text-end">
                    {crmCallId !== undefined && (
                        <Button
                            variant="danger"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={deleting}
                        >
                            <FontAwesomeIcon icon="trash" /> წაშლა
                            {deleting && <Spinner size="sm" animation="border" />}
                        </Button>
                    )}
                </Col>
            </Row>

            <Row>
                <Col sm="7">
                    <StudentContractPicker
                        id="studentContract"
                        label="მოსწავლე (კონტრაქტი)"
                        academicYears={lookups.academicYears}
                        academicYearId={form.academicYearId}
                        studentContractId={form.studentContractId}
                        contractName={crmCall?.studentContractName}
                        required
                        useStudentContracts={useGetCrmCallStudentContractsQuery}
                        onYearChange={(academicYearId) =>
                            setForm((f) =>
                                f ? { ...f, academicYearId, studentContractId: "" } : f
                            )
                        }
                        onContractChange={(studentContractId) =>
                            setField("studentContractId", studentContractId)
                        }
                    />
                </Col>
            </Row>
            <CrmCallFields
                form={form}
                callTypes={lookups.callTypes}
                answerTypes={lookups.answerTypes}
                onChange={setField}
            />

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button variant="secondary" className="me-2" onClick={close}>
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving}>
                    <FontAwesomeIcon icon="save" />
                    {crmCallId === undefined ? " შექმნა" : " შენახვა"}
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება ზარი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ ${formatDateTime(form.callDate)}-ის ზარი?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default CrmCallEdit;
