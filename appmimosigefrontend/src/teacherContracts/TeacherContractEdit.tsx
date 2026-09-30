//TeacherContractEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCreateTeacherContractMutation,
    useDeleteTeacherContractMutation,
    useGetTeacherContractFormLookupsQuery,
    useGetTeacherContractQuery,
    useLazySearchTeacherHumansQuery,
    useUpdateTeacherContractMutation,
} from "../redux/api/teacherContractsApi";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import HumanPicker from "../studentContracts/HumanPicker";
import { todayDateInputValue } from "../studentContracts/dateFormat";
import {
    type ITeacherContractForm,
    newTeacherContractForm,
    teacherContractFormToRequest,
    teacherContractToForm,
} from "./teacherContractForm";
import {
    teacherContractsMenuKey,
    useHasTeacherContractsRight,
} from "./teacherContractsMenu";

type TextField =
    | "contractNumber"
    | "contractDate"
    | "bankAccount"
    | "bankAccountCode"
    | "fixedAmount"
    | "description"
    | "workHoursStart"
    | "workHoursEnd"
    | "contractEndDate"
    | "rsQuoteTypeId"
    | "rsCountryId"
    | "salarySchemaByHoursId"
    | "workHourGroupId";

type CheckField = "pensionScheme" | "indEnt" | "nextMonth";

//წარწერები Access-ის ველების აღწერებიდანაა (ფორმაზე ინგლისური label-ები იყო)
const TeacherContractEdit: FC = () => {
    const { id: idParam } = useParams<{ id: string }>();
    const id = idParam ? Number(idParam) : undefined;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const hasRight = useHasTeacherContractsRight();

    const { data: lookups } = useGetTeacherContractFormLookupsQuery(
        undefined,
        { skip: !hasRight }
    );
    const { data: contract, isFetching: contractLoading } =
        useGetTeacherContractQuery(id ?? 0, {
            skip: !hasRight || id === undefined,
            refetchOnMountOrArgChange: true,
        });
    const [createContract, { isLoading: creating }] =
        useCreateTeacherContractMutation();
    const [updateContract, { isLoading: updating }] =
        useUpdateTeacherContractMutation();
    const [deleteContract, { isLoading: deleting }] =
        useDeleteTeacherContractMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<ITeacherContractForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = id === undefined ? "new" : `edit/${id}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (id === undefined) {
            setForm(newTeacherContractForm(todayDateInputValue()));
            setFormKey(currentKey);
        } else if (contract && contract.id === id && !contractLoading) {
            setForm(teacherContractToForm(contract));
            setFormKey(currentKey);
        }
    }, [currentKey, formKey, lookups, contract, contractLoading, id]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    if (hasRight === false)
        return <h5>მასწავლებლების კონტრაქტების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const setField = <K extends keyof ITeacherContractForm>(
        field: K,
        value: ITeacherContractForm[K]
    ) => setForm((f) => (f ? { ...f, [field]: value } : f));

    const saving = creating || updating;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = teacherContractFormToRequest(form);
        try {
            if (id === undefined) await createContract(request).unwrap();
            else await updateContract({ id, request }).unwrap();
            navigate(`/${teacherContractsMenuKey}`);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (id === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteContract(id).unwrap();
            navigate(`/${teacherContractsMenuKey}`);
        } catch {
            //მაგალითად, კონტრაქტზე უკვე მიბმულია ჯგუფი ან ხელფასი
        }
    }

    const textInput = (
        field: TextField,
        label: string,
        attributes: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> = {}
    ) => (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={field}>{label}</Form.Label>
            <Form.Control
                id={field}
                {...attributes}
                value={form[field]}
                onChange={(e) => setField(field, e.target.value)}
            />
        </Form.Group>
    );

    const select = (
        field: TextField,
        label: string,
        items: ILookupItem[],
        required = false
    ) => (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={field}>{label}</Form.Label>
            <Form.Select
                id={field}
                required={required}
                value={form[field]}
                onChange={(e) => setField(field, e.target.value)}
            >
                <option value="">
                    {required ? "-- აირჩიეთ --" : "-- არ არის --"}
                </option>
                {items.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </Form.Select>
        </Form.Group>
    );

    const checkBox = (field: CheckField, label: string) => (
        <Form.Check
            id={field}
            className="mb-2"
            label={label}
            checked={form[field]}
            onChange={(e) => setField(field, e.target.checked)}
        />
    );

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>
                        {id === undefined
                            ? "ახალი მასწავლებლის კონტრაქტი"
                            : `მასწავლებლის კონტრაქტი ${contract?.contractNumber ?? ""}`}
                    </h5>
                </Col>
                <Col sm="4" className="text-end">
                    {id !== undefined && (
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
                    {textInput("contractNumber", "კონტრაქტის ნომერი", {
                        required: true,
                        maxLength: 5,
                        pattern: "T\\d\\.\\d{2}",
                        title: "ფორმატი T0.00, მაგალითად T3.01",
                        placeholder: "T0.00",
                    })}
                </Col>
                <Col sm="3">
                    {textInput("contractDate", "კონტრაქტის თარიღი", {
                        type: "date",
                        required: true,
                    })}
                </Col>
                <Col sm="7">
                    <HumanPicker
                        id="teacherHuman"
                        label="თანამშრომელი"
                        humanId={form.teacherHumanId}
                        humanName={form.teacherName}
                        useSearchHumans={useLazySearchTeacherHumansQuery}
                        onChange={(humanId, name) =>
                            setForm((f) =>
                                f
                                    ? {
                                          ...f,
                                          teacherHumanId: humanId,
                                          teacherName: name,
                                      }
                                    : f
                            )
                        }
                    />
                </Col>
            </Row>

            <Row>
                <Col sm="3">
                    {textInput("contractEndDate", "კონტრაქტის დასრულების თარიღი", {
                        type: "date",
                        min: form.contractDate,
                    })}
                </Col>
                <Col sm="4">
                    {textInput("bankAccount", "ანგარიშის ნომერი", {
                        maxLength: 22,
                    })}
                </Col>
                <Col sm="2">
                    {textInput("bankAccountCode", "ბანკის კოდი", {
                        maxLength: 8,
                    })}
                </Col>
                <Col sm="3" className="d-flex flex-column justify-content-end">
                    {checkBox("pensionScheme", "მონაწილეობს საპენსიო სქემაში")}
                    {checkBox("indEnt", "ინდივიდუალური მეწარმე")}
                </Col>
            </Row>

            <Row>
                <Col sm="4">
                    {select(
                        "rsQuoteTypeId",
                        "განაცემის სახე (საგადასახადოსათვის)",
                        lookups.rsQuoteTypes
                    )}
                </Col>
                <Col sm="4">
                    {select(
                        "rsCountryId",
                        "ქვეყანა (საგადასახადოსათვის)",
                        lookups.rsCountries,
                        true
                    )}
                </Col>
            </Row>

            <Row>
                <Col sm="4">
                    {textInput(
                        "fixedAmount",
                        "განაცემის ყოველთვიური ფიქსირებული რაოდენობა",
                        { type: "number", required: true, min: 0, step: "0.01" }
                    )}
                </Col>
                <Col sm="3" className="d-flex align-items-end">
                    {checkBox("nextMonth", "განაცემი ეკუთვნის შემდეგ თვეს")}
                </Col>
                <Col sm="5">
                    {textInput(
                        "description",
                        "განაცემის შინაარსი (თუ ხელფასი არ არის)",
                        { maxLength: 255, placeholder: "ხელფასი" }
                    )}
                </Col>
            </Row>

            <Row>
                <Col sm="4">
                    {select(
                        "salarySchemaByHoursId",
                        "ხელფასის ძირითადი სქემა საათობრივი ანაზღაურებისათვის",
                        lookups.salarySchemes
                    )}
                </Col>
                <Col sm="4">
                    {select(
                        "workHourGroupId",
                        "სამუშაო საათების ჯგუფი",
                        lookups.workHourGroups
                    )}
                </Col>
                <Col sm="2">
                    {textInput("workHoursStart", "სამუშაოს დაწყება", {
                        type: "time",
                    })}
                </Col>
                <Col sm="2">
                    {textInput("workHoursEnd", "სამუშაოს დასრულება", {
                        type: "time",
                    })}
                </Col>
            </Row>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button
                    variant="secondary"
                    className="me-2"
                    onClick={() => navigate(`/${teacherContractsMenuKey}`)}
                >
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving}>
                    <FontAwesomeIcon icon="save" />
                    {id === undefined ? " შექმნა" : " შენახვა"}
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება მასწავლებლის კონტრაქტი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ კონტრაქტი "${form.contractNumber}"?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default TeacherContractEdit;
