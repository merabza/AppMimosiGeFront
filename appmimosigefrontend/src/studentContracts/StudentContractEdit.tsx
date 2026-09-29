//StudentContractEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCreateStudentContractMutation,
    useDeleteStudentContractMutation,
    useGetStudentContractFormLookupsQuery,
    useGetStudentContractQuery,
    useUpdateStudentContractMutation,
} from "../redux/api/studentContractsApi";
import HumanPicker from "./HumanPicker";
import {
    contractToForm,
    type FeeField,
    formToRequest,
    type IContractForm,
    type IDetailFormRow,
    newContractForm,
    newDetailRow,
    recalculateAfterFeeFieldChange,
} from "./contractForm";
import { formatDateTime, todayDateInputValue } from "./dateFormat";
import {
    studentContractsMenuKey,
    useHasStudentContractsRight,
} from "./studentContractsMenu";

const feeColumns: { field: FeeField; caption: string; step: string }[] = [
    { field: "fourWeekHours", caption: "4 კვირის საათები", step: "0.5" },
    { field: "fourWeekFee", caption: "4 კვირის გადასახადი", step: "0.01" },
    { field: "oneHourFee", caption: "საათის ღირებულება", step: "0.01" },
];

const StudentContractEdit: FC = () => {
    const { scId: scIdParam } = useParams<{ scId: string }>();
    const scId = scIdParam ? Number(scIdParam) : undefined;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const hasRight = useHasStudentContractsRight();

    const { data: lookups } = useGetStudentContractFormLookupsQuery(
        undefined,
        { skip: !hasRight }
    );
    const { data: contract, isFetching: contractLoading } =
        useGetStudentContractQuery(scId ?? 0, {
            skip: !hasRight || scId === undefined,
            refetchOnMountOrArgChange: true,
        });
    const [createContract, { isLoading: creating }] =
        useCreateStudentContractMutation();
    const [updateContract, { isLoading: updating }] =
        useUpdateStudentContractMutation();
    const [deleteContract, { isLoading: deleting }] =
        useDeleteStudentContractMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<IContractForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = scId === undefined ? "new" : `edit/${scId}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (scId === undefined) {
            setForm(
                newContractForm(
                    todayDateInputValue(),
                    lookups.currentAcademicYearId
                )
            );
            setFormKey(currentKey);
        } else if (contract && contract.scId === scId && !contractLoading) {
            setForm(contractToForm(contract));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, lookups, contract, contractLoading, scId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    if (hasRight === false)
        return <h5>მოსწავლეების კონტრაქტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const setField = <K extends keyof IContractForm>(
        field: K,
        value: IContractForm[K]
    ) => setForm((f) => (f ? { ...f, [field]: value } : f));

    const setDetail = (key: number, change: (row: IDetailFormRow) => IDetailFormRow) =>
        setForm((f) =>
            f
                ? {
                      ...f,
                      details: f.details.map((d) =>
                          d.key === key ? change(d) : d
                      ),
                  }
                : f
        );

    const saving = creating || updating;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = formToRequest(form);
        try {
            if (scId === undefined) await createContract(request).unwrap();
            else await updateContract({ scId, request }).unwrap();
            navigate(`/${studentContractsMenuKey}`);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (scId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteContract(scId).unwrap();
            navigate(`/${studentContractsMenuKey}`);
        } catch {
            //მაგალითად, კონტრაქტზე უკვე მიბმულია ჯგუფი ან გადახდა
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>
                        {scId === undefined
                            ? "ახალი მოსწავლის კონტრაქტი"
                            : `მოსწავლის კონტრაქტი ${contract?.contractNumber ?? ""}`}
                    </h5>
                </Col>
                <Col sm="4" className="text-end">
                    {scId !== undefined && (
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
                <Col sm="2">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="contractNumber">კ. N</Form.Label>
                        <Form.Control
                            id="contractNumber"
                            required
                            maxLength={5}
                            pattern="\d\.\d{3}"
                            title="ფორმატი 0.000, მაგალითად 6.001"
                            placeholder="0.000"
                            value={form.contractNumber}
                            onChange={(e) =>
                                setField("contractNumber", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                <Col sm="2">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="contractDate">თარიღი</Form.Label>
                        <Form.Control
                            id="contractDate"
                            type="date"
                            required
                            value={form.contractDate}
                            onChange={(e) =>
                                setField("contractDate", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                <Col sm="2">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="academicYearId">
                            სასწ. წელი
                        </Form.Label>
                        <Form.Select
                            id="academicYearId"
                            required
                            value={form.academicYearId}
                            onChange={(e) =>
                                setField("academicYearId", e.target.value)
                            }
                        >
                            <option value="">-- აირჩიეთ --</option>
                            {lookups.academicYears.map((ay) => (
                                <option key={ay.id} value={ay.id}>
                                    {ay.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col sm="3">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="studentStatusId">
                            მოსწავლის სტატუსი
                        </Form.Label>
                        <Form.Select
                            id="studentStatusId"
                            value={form.studentStatusId}
                            onChange={(e) =>
                                setField("studentStatusId", e.target.value)
                            }
                        >
                            <option value="">-- არ არის --</option>
                            {lookups.studentStatuses.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col sm="3">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="desiredMonthlyPaymentDay">
                            გადახდის სასურველი დღე
                        </Form.Label>
                        <Form.Control
                            id="desiredMonthlyPaymentDay"
                            type="number"
                            min={1}
                            max={28}
                            step={1}
                            value={form.desiredMonthlyPaymentDay}
                            onChange={(e) =>
                                setField(
                                    "desiredMonthlyPaymentDay",
                                    e.target.value
                                )
                            }
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col sm="5">
                    <HumanPicker
                        id="studentHuman"
                        label="მოსწავლე"
                        humanId={form.studentHumanId}
                        humanName={form.studentName}
                        onChange={(id, name) =>
                            setForm((f) =>
                                f
                                    ? { ...f, studentHumanId: id, studentName: name }
                                    : f
                            )
                        }
                    />
                </Col>
                <Col sm="5">
                    <HumanPicker
                        id="payerHuman"
                        label="გადამხდელი (მშობელი ან თვითონ მოსწავლე)"
                        humanId={form.payerHumanId}
                        humanName={form.payerName}
                        onChange={(id, name) =>
                            setForm((f) =>
                                f ? { ...f, payerHumanId: id, payerName: name } : f
                            )
                        }
                    />
                </Col>
                <Col sm="2" className="d-flex align-items-end mb-2">
                    <Button
                        variant="outline-secondary"
                        disabled={form.studentHumanId === 0}
                        title="გადამხდელი თვითონ მოსწავლეა"
                        onClick={() =>
                            setForm((f) =>
                                f
                                    ? {
                                          ...f,
                                          payerHumanId: f.studentHumanId,
                                          payerName: f.studentName,
                                      }
                                    : f
                            )
                        }
                    >
                        იხდის თვითონ
                    </Button>
                </Col>
            </Row>

            {scId !== undefined && contract && (
                <Row className="mb-2 text-muted">
                    <Col>
                        შემდეგი გადახდის თარიღი:{" "}
                        {formatDateTime(contract.nextPayDate) || "—"}
                        {contract.dirtyNextPayDate &&
                            " (საჭიროებს გადაანგარიშებას)"}
                    </Col>
                </Row>
            )}

            <h6>ტარიფები</h6>
            <Table size="sm" bordered>
                <thead>
                    <tr>
                        <th>საგანი</th>
                        <th>ჯგუფის ზომა</th>
                        {feeColumns.map((c) => (
                            <th key={c.field}>{c.caption}</th>
                        ))}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {form.details.map((row, index) => (
                        <tr key={row.key}>
                            <td>
                                <Form.Select
                                    aria-label={`საგანი ${index + 1}`}
                                    required
                                    value={row.courseId}
                                    onChange={(e) =>
                                        setDetail(row.key, (d) => ({
                                            ...d,
                                            courseId: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {lookups.courses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            <td>
                                <Form.Select
                                    aria-label={`ჯგუფის ზომა ${index + 1}`}
                                    required
                                    value={row.groupSizeId}
                                    onChange={(e) =>
                                        setDetail(row.key, (d) => ({
                                            ...d,
                                            groupSizeId: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {lookups.groupSizes.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            {feeColumns.map((c) => (
                                <td key={c.field}>
                                    <Form.Control
                                        aria-label={`${c.caption} ${index + 1}`}
                                        type="number"
                                        required
                                        min={0}
                                        step={c.step}
                                        value={row[c.field]}
                                        onChange={(e) =>
                                            setDetail(row.key, (d) => ({
                                                ...d,
                                                [c.field]: e.target.value,
                                            }))
                                        }
                                        onBlur={() =>
                                            setDetail(row.key, (d) =>
                                                recalculateAfterFeeFieldChange(
                                                    d,
                                                    c.field
                                                )
                                            )
                                        }
                                    />
                                </td>
                            ))}
                            <td>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    title="ტარიფის წაშლა"
                                    onClick={() =>
                                        setField(
                                            "details",
                                            form.details.filter(
                                                (d) => d.key !== row.key
                                            )
                                        )
                                    }
                                >
                                    <FontAwesomeIcon icon="minus" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Button
                variant="outline-primary"
                size="sm"
                className="mb-3"
                onClick={() =>
                    setField("details", [...form.details, newDetailRow()])
                }
            >
                <FontAwesomeIcon icon="plus" /> ტარიფის დამატება
            </Button>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button
                    variant="secondary"
                    className="me-2"
                    onClick={() => navigate(`/${studentContractsMenuKey}`)}
                >
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving}>
                    <FontAwesomeIcon icon="save" />
                    {scId === undefined ? " შექმნა" : " შენახვა"}
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება მოსწავლის კონტრაქტი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ კონტრაქტი "${form.contractNumber}" ტარიფებთან ერთად?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default StudentContractEdit;
