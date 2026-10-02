//SalaryParts.tsx

import { useState, type FC } from "react";
import { Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import {
    useCreateSalaryPartMutation,
    useDeleteSalaryPartMutation,
    useUpdateSalaryPartMutation,
} from "../redux/api/salaryApi";
import type { ISalaryFormLookups, ISalaryPart } from "../redux/types/salaryTypes";
import {
    emptySalaryPartForm,
    formatMoney,
    isDeductionType,
    isPartAmountInvalid,
    isPartCalculated,
    manualPartTypes,
    salaryPartDeleteQuestion,
    salaryPartFormToRequest,
    salaryPartToForm,
    type ISalaryPartForm,
} from "./salaryForm";

interface SalaryPartsProps {
    shId: number;
    parts: ISalaryPart[];
    lookups: ISalaryFormLookups;
}

//რედაქტირებადი მდგენელი: ახალი ან არსებულის იდენტიფიკატორი
type EditedPart = "new" | number;

//უწყისის მდგენელები (Access-ში ფორმა არ ჰქონდა, ცხრილში პირდაპირ იწერებოდა). ჩატარებული გაკვეთილების ხელფასს
//(ტიპი 1) გამოთვლა ქმნის და აქ მხოლოდ ჩანს
const SalaryParts: FC<SalaryPartsProps> = ({ shId, parts, lookups }) => {
    const dispatch = useAppDispatch();
    const [createPart, { isLoading: creating }] = useCreateSalaryPartMutation();
    const [updatePart, { isLoading: updating }] = useUpdateSalaryPartMutation();
    const [deletePart, { isLoading: deleting }] = useDeleteSalaryPartMutation();
    const [edited, setEdited] = useState<EditedPart | null>(null);
    const [form, setForm] = useState<ISalaryPartForm>(emptySalaryPartForm);
    const [partToDelete, setPartToDelete] = useState<ISalaryPart | null>(null);

    const types = manualPartTypes(lookups.partTypes);
    const saving = creating || updating;
    const amountInvalid = form.spAmount !== "" && isPartAmountInvalid(form, types);
    const deduction = isDeductionType(types, form.salaryPartTypeId);

    function startEdit(part: ISalaryPart | null) {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setEdited(part ? part.spId : "new");
        setForm(part ? salaryPartToForm(part) : emptySalaryPartForm);
    }

    const setField = <K extends keyof ISalaryPartForm>(field: K, value: ISalaryPartForm[K]) =>
        setForm((f) => ({ ...f, [field]: value }));

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (edited === null || isPartAmountInvalid(form, types)) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = salaryPartFormToRequest(form);
        try {
            if (edited === "new") await createPart({ shId, request }).unwrap();
            else await updatePart({ spId: edited, request }).unwrap();
            setEdited(null);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და გვერდზე ჩანს
        }
    }

    async function handleDelete(part: ISalaryPart) {
        setPartToDelete(null);
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deletePart(part.spId).unwrap();
            if (edited === part.spId) setEdited(null);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და გვერდზე ჩანს
        }
    }

    return (
        <div className="mb-3">
            <Row className="mb-1">
                <Col sm="8">
                    <h6>მდგენელები (დანამატები და გამოქვითვები)</h6>
                </Col>
                <Col sm="4" className="text-end">
                    <Button size="sm" onClick={() => startEdit(null)} disabled={edited === "new"}>
                        <FontAwesomeIcon icon="plus" /> მდგენელის დამატება
                    </Button>
                </Col>
            </Row>

            <Table striped bordered hover size="sm">
                <thead>
                    <tr>
                        <th>თანამშრომელი</th>
                        <th>ტიპი</th>
                        <th className="text-end">თანხა</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {parts.map((part) => (
                        <tr key={part.spId} className={edited === part.spId ? "table-active" : undefined}>
                            <td>{part.employeeName}</td>
                            <td>{part.salaryPartTypeName ?? ""}</td>
                            <td className="text-end">{formatMoney(part.spAmount)}</td>
                            <td className="text-end">
                                {isPartCalculated(part) ? (
                                    <small className="text-muted">გამოთვლით</small>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="link"
                                            title="მდგენელის შეცვლა"
                                            onClick={() => startEdit(part)}
                                        >
                                            <FontAwesomeIcon icon="edit" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="link"
                                            className="text-danger"
                                            title="მდგენელის წაშლა"
                                            onClick={() => setPartToDelete(part)}
                                            disabled={deleting}
                                        >
                                            <FontAwesomeIcon icon="trash" />
                                        </Button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {parts.length === 0 && (
                        <tr>
                            <td colSpan={4}>მდგენელები არ არის</td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {edited !== null && (
                <Form onSubmit={handleSubmit} aria-label="მდგენელი">
                    <Row className="align-items-start">
                        <Col sm="4">
                            <Form.Group className="mb-2">
                                <Form.Label htmlFor="partEmployee">თანამშრომელი</Form.Label>
                                <Form.Select
                                    id="partEmployee"
                                    required
                                    value={form.teacherContractId}
                                    onChange={(e) => setField("teacherContractId", e.target.value)}
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {lookups.employees.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col sm="3">
                            <Form.Group className="mb-2">
                                <Form.Label htmlFor="partType">ტიპი</Form.Label>
                                <Form.Select
                                    id="partType"
                                    required
                                    value={form.salaryPartTypeId}
                                    onChange={(e) => setField("salaryPartTypeId", e.target.value)}
                                >
                                    <option value="">-- აირჩიეთ --</option>
                                    {types.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col sm="2">
                            <Form.Group className="mb-2">
                                <Form.Label htmlFor="partAmount">თანხა</Form.Label>
                                <Form.Control
                                    id="partAmount"
                                    type="number"
                                    step="any"
                                    required
                                    value={form.spAmount}
                                    isInvalid={amountInvalid}
                                    onChange={(e) => setField("spAmount", e.target.value)}
                                />
                                <Form.Control.Feedback type="invalid">
                                    გამოქვითვა დადებითი თანხით იწერება
                                </Form.Control.Feedback>
                                {deduction && !amountInvalid && (
                                    <Form.Text>გამოქვითვა დადებითი თანხით იწერება</Form.Text>
                                )}
                            </Form.Group>
                        </Col>
                        <Col sm="3" className="text-end pt-4">
                            <Button variant="secondary" className="me-2" onClick={() => setEdited(null)}>
                                <FontAwesomeIcon icon="window-close" /> გაუქმება
                            </Button>
                            <Button type="submit" disabled={saving || isPartAmountInvalid(form, types)}>
                                <FontAwesomeIcon icon="save" /> შენახვა
                                {saving && <Spinner size="sm" animation="border" />}
                            </Button>
                        </Col>
                    </Row>
                </Form>
            )}

            {/* კითხვა მხოლოდ არჩეულ მდგენელზე იხატება */}
            {partToDelete && (
                <MessageBox
                    show
                    title="იშლება მდგენელი"
                    text={salaryPartDeleteQuestion(partToDelete)}
                    primaryButtonText="დიახ"
                    secondaryButtonText="არა"
                    onConfirmed={() => handleDelete(partToDelete)}
                    onClosed={() => setPartToDelete(null)}
                />
            )}
        </div>
    );
};

export default SalaryParts;
