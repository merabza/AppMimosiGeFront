//WorkHourEdit.tsx

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
    useCreateWorkHourMutation,
    useDeleteWorkHourMutation,
    useGetWorkHourFormLookupsQuery,
    useGetWorkHourQuery,
    useUpdateWorkHourMutation,
} from "../redux/api/workHoursApi";
import { formatDateTime } from "../studentContracts/dateFormat";
import {
    isEndNotAfterStart,
    type IWorkHourForm,
    newWorkHourForm,
    nowDateTimeInputValue,
    workHourFormToRequest,
    workHourToForm,
} from "./workHourForm";
import { useHasWorkHoursRight, workHoursMenuKey } from "./workHoursMenu";

//Access-ის FrmWorkHours-ის სტრიქონი: თანამშრომელი, სამუშაოს დაწყება და დასრულება
const WorkHourEdit: FC = () => {
    const { whId: whIdParam } = useParams<{ whId: string }>();
    const whId = whIdParam ? Number(whIdParam) : undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const hasRight = useHasWorkHoursRight();

    const { data: lookups } = useGetWorkHourFormLookupsQuery(undefined, { skip: !hasRight });
    const { data: workHour, isFetching: workHourLoading } = useGetWorkHourQuery(whId ?? 0, {
        skip: !hasRight || whId === undefined,
    });
    const [createWorkHour, { isLoading: creating }] = useCreateWorkHourMutation();
    const [updateWorkHour, { isLoading: updating }] = useUpdateWorkHourMutation();
    const [deleteWorkHour, { isLoading: deleting }] = useDeleteWorkHourMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<IWorkHourForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = whId === undefined ? "new" : `edit/${whId}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (whId === undefined) {
            setForm(newWorkHourForm(nowDateTimeInputValue()));
            setFormKey(currentKey);
        } else if (workHour && workHour.id === whId && !workHourLoading) {
            setForm(workHourToForm(workHour));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, lookups, workHour, workHourLoading, whId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    if (hasRight === false) return <h5>სამუშაო საათების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const saving = creating || updating;
    const endInvalid = isEndNotAfterStart(form);

    const setField = <K extends keyof IWorkHourForm>(field: K, value: IWorkHourForm[K]) =>
        setForm((f) => (f ? { ...f, [field]: value } : f));

    //სიაზე იმავე ფილტრით დაბრუნება; პირდაპირ გახსნილი ფორმიდან (ისტორიის გარეშე) სიაზე
    function close() {
        if (location.key === "default") navigate(`/${workHoursMenuKey}`);
        else navigate(-1);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form || isEndNotAfterStart(form)) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = workHourFormToRequest(form);
        try {
            if (whId === undefined) await createWorkHour(request).unwrap();
            else await updateWorkHour({ whId, request }).unwrap();
            close();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (whId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteWorkHour(whId).unwrap();
            close();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>{whId === undefined ? "ახალი ჩანაწერი" : "ნამუშევარი დრო"}</h5>
                </Col>
                <Col sm="4" className="text-end">
                    {whId !== undefined && (
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
                <Col sm="5">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="teacherContractId">თანამშრომელი</Form.Label>
                        <Form.Select
                            id="teacherContractId"
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
                        <Form.Label htmlFor="whStart">სამუშაოს დაწყება</Form.Label>
                        <Form.Control
                            id="whStart"
                            type="datetime-local"
                            step="1"
                            required
                            value={form.whStart}
                            onChange={(e) => setField("whStart", e.target.value)}
                        />
                    </Form.Group>
                </Col>
                <Col sm="3">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="whEnd">სამუშაოს დასრულება</Form.Label>
                        <Form.Control
                            id="whEnd"
                            type="datetime-local"
                            step="1"
                            value={form.whEnd}
                            isInvalid={endInvalid}
                            onChange={(e) => setField("whEnd", e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid">
                            დასრულება დაწყებაზე გვიან უნდა იყოს
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
            </Row>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button variant="secondary" className="me-2" onClick={close}>
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving || endInvalid}>
                    <FontAwesomeIcon icon="save" />
                    {whId === undefined ? " შექმნა" : " შენახვა"}
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება ჩანაწერი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ ${formatDateTime(form.whStart)}-ის ჩანაწერი?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default WorkHourEdit;
