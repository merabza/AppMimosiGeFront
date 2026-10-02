//SalaryEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCountSalaryMutation,
    useCreateSalaryHeaderMutation,
    useDeleteSalaryHeaderMutation,
    useDownloadTransferFileMutation,
    useGetSalaryFormLookupsQuery,
    useGetSalaryHeaderQuery,
    useUpdateSalaryHeaderMutation,
} from "../redux/api/salaryApi";
import type { ISalaryCountResult } from "../redux/types/salaryTypes";
import { formatDate } from "../studentContracts/dateFormat";
import {
    newSalaryHeaderForm,
    salaryHeaderFormToRequest,
    salaryHeaderToForm,
    type ISalaryHeaderForm,
} from "./salaryForm";
import { salaryEditUrl, salaryMenuKey, useHasSalaryRight } from "./salaryMenu";
import SalaryParts from "./SalaryParts";
import SalaryLines from "./SalaryLines";

//Access-ის FrmSalary-ის ერთი უწყისი: თარიღები, მდგენელები, გამოთვლა, სტრიქონები და გადარიცხვის ფაილი
const SalaryEdit: FC = () => {
    const { shId: shIdParam } = useParams<{ shId: string }>();
    const shId = shIdParam ? Number(shIdParam) : undefined;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const hasRight = useHasSalaryRight();

    const { data: lookups } = useGetSalaryFormLookupsQuery(undefined, { skip: !hasRight });
    const { data: header, isFetching: headerLoading } = useGetSalaryHeaderQuery(shId ?? 0, {
        skip: !hasRight || shId === undefined,
    });
    const [createHeader, { isLoading: creating }] = useCreateSalaryHeaderMutation();
    const [updateHeader, { isLoading: updating }] = useUpdateSalaryHeaderMutation();
    const [deleteHeader, { isLoading: deleting }] = useDeleteSalaryHeaderMutation();
    const [countSalary, { isLoading: counting }] = useCountSalaryMutation();
    const [downloadTransfer, { isLoading: downloading }] = useDownloadTransferFileMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<ISalaryHeaderForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCountConfirm, setShowCountConfirm] = useState(false);
    const [countResult, setCountResult] = useState<ISalaryCountResult | null>(null);

    //ფორმა ერთხელ ივსება თითო უწყისზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = shId === undefined ? "new" : `edit/${shId}`;
    useEffect(() => {
        if (formKey === currentKey) return;
        if (shId === undefined) {
            setForm(newSalaryHeaderForm());
            setFormKey(currentKey);
        } else if (header && header.shId === shId && !headerLoading) {
            setForm(salaryHeaderToForm(header));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, header, headerLoading, shId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setCountResult(null);
    }, [dispatch, currentKey]);

    if (hasRight === false) return <h5>ხელფასების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const saving = creating || updating;
    const savedForm = header ? salaryHeaderToForm(header) : null;
    //შეუნახავი თარიღებით გამოთვლა და ფაილი ძველ თარიღებს გამოიყენებდა
    const dirty =
        savedForm === null ||
        savedForm.shChargeDate !== form.shChargeDate ||
        savedForm.shTransferDate !== form.shTransferDate;

    const setField = <K extends keyof ISalaryHeaderForm>(field: K, value: ISalaryHeaderForm[K]) =>
        setForm((f) => (f ? { ...f, [field]: value } : f));

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = salaryHeaderFormToRequest(form);
        try {
            if (shId === undefined) {
                const newId = await createHeader(request).unwrap();
                navigate(salaryEditUrl(newId), { replace: true });
            } else await updateHeader({ shId, request }).unwrap();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (shId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteHeader(shId).unwrap();
            navigate(`/${salaryMenuKey}`);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleCount() {
        setShowCountConfirm(false);
        if (shId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setCountResult(null);
        try {
            setCountResult(await countSalary(shId).unwrap());
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleTransferFile() {
        if (shId === undefined || !header) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await downloadTransfer({ shId, transferDate: header.shTransferDate }).unwrap();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    return (
        <div>
            <Form onSubmit={handleSubmit}>
                <Row className="mb-2">
                    <Col sm="8">
                        <h5>
                            {header ? `ხელფასის უწყისი ${formatDate(header.shChargeDate)}` : "ახალი უწყისი"}
                        </h5>
                    </Col>
                    <Col sm="4" className="text-end">
                        {shId !== undefined && (
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
                <Row className="align-items-end">
                    <Col sm="3">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="shChargeDate">დარიცხვის თარიღი</Form.Label>
                            <Form.Control
                                id="shChargeDate"
                                type="date"
                                required
                                value={form.shChargeDate}
                                onChange={(e) => setField("shChargeDate", e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm="3">
                        <Form.Group className="mb-2">
                            <Form.Label htmlFor="shTransferDate">გადარიცხვის თარიღი</Form.Label>
                            <Form.Control
                                id="shTransferDate"
                                type="date"
                                required
                                value={form.shTransferDate}
                                onChange={(e) => setField("shTransferDate", e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm="6" className="text-end mb-2">
                        <Button
                            variant="secondary"
                            className="me-2"
                            onClick={() => navigate(`/${salaryMenuKey}`)}
                        >
                            <FontAwesomeIcon icon="window-close" /> დახურვა
                        </Button>
                        <Button type="submit" disabled={saving || !dirty}>
                            <FontAwesomeIcon icon="save" />
                            {shId === undefined ? " შექმნა" : " შენახვა"}
                            {saving && <Spinner size="sm" animation="border" />}
                        </Button>
                    </Col>
                </Row>
                <Form.Text>
                    დარიცხვის თარიღით პოულობს გამოთვლა ჩატარებული გაკვეთილების ხელფასს: წინა თვის გაკვეთილები
                    მომდევნო თვის 5 რიცხვის უწყისში ხვდება
                </Form.Text>
            </Form>

            {header && (
                <>
                    <div className="my-3">
                        <Button
                            className="me-2"
                            onClick={() => setShowCountConfirm(true)}
                            disabled={counting || dirty}
                        >
                            <FontAwesomeIcon icon="sync" /> გამოთვლა
                            {counting && <Spinner size="sm" animation="border" />}
                        </Button>
                        <Button
                            variant="outline-primary"
                            onClick={handleTransferFile}
                            disabled={downloading || dirty}
                        >
                            <FontAwesomeIcon icon="file-export" /> გადარიცხვის ფაილის მომზადება
                            {downloading && <Spinner size="sm" animation="border" />}
                        </Button>
                        {dirty && <Form.Text className="ms-2">ჯერ თარიღები შეინახეთ</Form.Text>}
                    </div>
                    {countResult && (
                        <Alert variant="success" show onClose={() => setCountResult(null)} dismissible>
                            გამოითვალა: {countResult.linesCount} სტრიქონი, ჩატარებული გაკვეთილების{" "}
                            {countResult.lessonPartsCount} მდგენელი, {countResult.detailsCount} დეტალი
                        </Alert>
                    )}
                </>
            )}

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            {header && (
                <>
                    <SalaryParts shId={header.shId} parts={header.parts} lookups={lookups} />
                    <p className="text-muted small">
                        მდგენელების შეცვლის შემდეგ სტრიქონები ხელახლა გამოთვალეთ
                    </p>
                    <SalaryLines lines={header.lines} details={header.details} />
                </>
            )}

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება უწყისი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ ${formatDate(header?.shChargeDate)}-ის უწყისი?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
            <MessageBox
                show={showCountConfirm}
                title="გამოთვლა"
                text={
                    header && header.lines.length > 0
                        ? "უწყისის სტრიქონები და ჩატარებული გაკვეთილების ხელფასი წაიშლება და თავიდან დაითვლება " +
                          "(ხელით შეტანილი მდგენელები რჩება). გავაგრძელო?"
                        : "უწყისი გამოითვლება. გავაგრძელო?"
                }
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleCount}
                onClosed={() => setShowCountConfirm(false)}
            />
        </div>
    );
};

export default SalaryEdit;
