//PaymentEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCreatePaymentMutation,
    useDeletePaymentMutation,
    useGetPaymentFormLookupsQuery,
    useGetPaymentQuery,
    useUpdatePaymentMutation,
} from "../redux/api/paymentsApi";
import { formatDate, todayDateInputValue } from "../studentContracts/dateFormat";
import StudentContractPicker from "./StudentContractPicker";
import {
    amountValidationMessage,
    type IPaymentForm,
    newPaymentForm,
    paymentFormToRequest,
    paymentToForm,
} from "./paymentForm";
import {
    paymentsMenuKey,
    useCanCheckPayments,
    useHasPaymentsRight,
} from "./paymentsMenu";

//Access-ის FrmPayments-ის სტრიქონი: მოსწავლის კონტრაქტი, თარიღი, თანხა, დოკუმენტი, ბანკი და (უფლებით) შემოწმება
const PaymentEdit: FC = () => {
    const { paymentId: paymentIdParam } = useParams<{ paymentId: string }>();
    const paymentId = paymentIdParam ? Number(paymentIdParam) : undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const hasRight = useHasPaymentsRight();
    const canCheck = useCanCheckPayments();

    const { data: lookups } = useGetPaymentFormLookupsQuery(undefined, {
        skip: !hasRight,
    });
    const { data: payment, isFetching: paymentLoading } = useGetPaymentQuery(
        paymentId ?? 0,
        { skip: !hasRight || paymentId === undefined }
    );
    const [createPayment, { isLoading: creating }] = useCreatePaymentMutation();
    const [updatePayment, { isLoading: updating }] = useUpdatePaymentMutation();
    const [deletePayment, { isLoading: deleting }] = useDeletePaymentMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<IPaymentForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = paymentId === undefined ? "new" : `edit/${paymentId}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (paymentId === undefined) {
            setForm(
                newPaymentForm(
                    todayDateInputValue(),
                    lookups.currentAcademicYearId?.toString() ?? ""
                )
            );
            setFormKey(currentKey);
        } else if (payment && payment.id === paymentId && !paymentLoading) {
            setForm(paymentToForm(payment));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, lookups, payment, paymentLoading, paymentId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    if (hasRight === false) return <h5>გადახდების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    //შემოწმებულ გადახდას უფლების გარეშე მხოლოდ ნახვა შეიძლება (D77)
    const readOnly = payment?.checked === true && !canCheck;
    const saving = creating || updating;

    const setField = <K extends keyof IPaymentForm>(
        field: K,
        value: IPaymentForm[K]
    ) => setForm((f) => (f ? { ...f, [field]: value } : f));

    //სიაზე იმავე ფილტრით დაბრუნება; პირდაპირ გახსნილი ფორმიდან (ისტორიის გარეშე) სიაზე
    function close() {
        if (location.key === "default") navigate(`/${paymentsMenuKey}`);
        else navigate(-1);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = paymentFormToRequest(form);
        try {
            if (paymentId === undefined) await createPayment(request).unwrap();
            else await updatePayment({ paymentId, request }).unwrap();
            close();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (paymentId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deletePayment(paymentId).unwrap();
            close();
        } catch {
            //მაგალითად, გადახდა უკვე შემოწმებულია
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>{paymentId === undefined ? "ახალი გადახდა" : "გადახდა"}</h5>
                </Col>
                <Col sm="4" className="text-end">
                    {paymentId !== undefined && !readOnly && (
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

            {readOnly && (
                <Alert variant="info">
                    გადახდა შემოწმებულია: მის შეცვლას ან წაშლას მხოლოდ გადახდების
                    შემოწმების უფლების მქონე როლი შეძლებს
                </Alert>
            )}

            <fieldset disabled={readOnly}>
                <Row>
                    <Col sm="7">
                        <StudentContractPicker
                            id="studentContract"
                            label="მოსწავლე (კონტრაქტი)"
                            academicYears={lookups.academicYears}
                            academicYearId={form.academicYearId}
                            studentContractId={form.studentContractId}
                            contractName={payment?.studentContractName}
                            required
                            disabled={readOnly}
                            onYearChange={(academicYearId) =>
                                setForm((f) =>
                                    f
                                        ? { ...f, academicYearId, studentContractId: "" }
                                        : f
                                )
                            }
                            onContractChange={(studentContractId) =>
                                setField("studentContractId", studentContractId)
                            }
                        />
                    </Col>
                    <Col sm="2">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="payDate">გადახდის თარიღი</Form.Label>
                            <Form.Control
                                id="payDate"
                                type="date"
                                required
                                value={form.payDate}
                                onChange={(e) => setField("payDate", e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm="3">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="amount">თანხა</Form.Label>
                            {/* უარყოფითი დასაშვებია ("გადატანა" კონტრაქტებს შორის), 0 და 2-ზე მეტი ათწილადი არა */}
                            <Form.Control
                                id="amount"
                                type="number"
                                step="0.01"
                                required
                                value={form.amount}
                                onChange={(e) => {
                                    e.target.setCustomValidity(
                                        amountValidationMessage(e.target.value)
                                    );
                                    setField("amount", e.target.value);
                                }}
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col sm="7">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="document">დოკუმენტი</Form.Label>
                            <Form.Control
                                id="document"
                                maxLength={255}
                                value={form.document}
                                onChange={(e) => setField("document", e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm="3">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="bankAccountId">
                                ბანკი / გადახდის სახე
                            </Form.Label>
                            <Form.Select
                                id="bankAccountId"
                                required
                                value={form.bankAccountId}
                                onChange={(e) =>
                                    setField("bankAccountId", e.target.value)
                                }
                            >
                                <option value="">-- აირჩიეთ --</option>
                                {lookups.bankAccounts.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    {canCheck && (
                        <Col sm="2" className="d-flex align-items-end">
                            <Form.Check
                                id="checked"
                                className="mb-3"
                                label="შემოწმებულია"
                                checked={form.checked}
                                onChange={(e) => setField("checked", e.target.checked)}
                            />
                        </Col>
                    )}
                </Row>
            </fieldset>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button variant="secondary" className="me-2" onClick={close}>
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                {!readOnly && (
                    <Button type="submit" disabled={saving}>
                        <FontAwesomeIcon icon="save" />
                        {paymentId === undefined ? " შექმნა" : " შენახვა"}
                        {saving && <Spinner size="sm" animation="border" />}
                    </Button>
                )}
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება გადახდა"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ ${formatDate(form.payDate)}-ის გადახდა (თანხა ${form.amount})?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default PaymentEdit;
