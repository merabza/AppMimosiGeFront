//LessonEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useGetLessonFormLookupsQuery,
    useGetLessonQuery,
    useUpdateLessonMutation,
} from "../redux/api/lessonsApi";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import { groupEditRoute } from "../groups/groupsMenu";
import {
    clearStudentRow,
    hasEnteredData,
    lessonFormToRequest,
    lessonToForm,
    markAllPresent,
    type ILessonForm,
    type ILessonStudentFormRow,
} from "./lessonForm";
import {
    cellKey,
    parseCellKey,
    targetCell,
} from "./lessonGridNavigation";
import { lessonEditUrl, lessonsMenuKey, useHasLessonsRight } from "./lessonsMenu";

type LessonField =
    | "lessonStatusId"
    | "substituteTeacherContractId"
    | "teacherLateMinutes"
    | "recoverDate"
    | "note";

type StudentTextField =
    | "theme"
    | "rate"
    | "teacherComment"
    | "studentComment"
    | "studentLateMinutes";

//ბადის რედაქტირებადი სვეტები კლავიატურით ნავიგაციის რიგით (0 = დაესწრო) და მათი სათაურები
const textColumns: { field: StudentTextField; caption: string }[] = [
    { field: "theme", caption: "თემა" },
    { field: "rate", caption: "შეფასება" },
    { field: "teacherComment", caption: "მასწავლებლის კომენტარი" },
    { field: "studentComment", caption: "მოსწავლის კომენტარი" },
    { field: "studentLateMinutes", caption: "დაგვიანება წთ." },
];

//Access-ის FrmLessons და "LessonsByStudents subform": გაკვეთილის ჟურნალი. ჯგუფს, მასწავლებელს, დროს და
//საათებს გენერატორი ადგენს და აქ მხოლოდ ჩანს
const LessonEdit: FC = () => {
    const { lessonId: lessonIdParam } = useParams<{ lessonId: string }>();
    const lessonId = Number(lessonIdParam);
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const hasRight = useHasLessonsRight();

    const { data: lookups } = useGetLessonFormLookupsQuery(undefined, {
        skip: !hasRight,
    });
    const {
        data: lesson,
        isFetching: lessonLoading,
        refetch,
    } = useGetLessonQuery(
        lessonId,
        { skip: !hasRight, refetchOnMountOrArgChange: true }
    );
    const [updateLesson, { isLoading: saving }] = useUpdateLessonMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<ILessonForm | null>(null);
    //ჩატვირთული გაკვეთილი, შეუნახავი ცვლილებების გასარჩევად
    const [loadedForm, setLoadedForm] = useState<ILessonForm | null>(null);
    //რომელი გაკვეთილით არის ფორმა შევსებული
    const [formLessonId, setFormLessonId] = useState<number | null>(null);
    const [saved, setSaved] = useState(false);

    //ფორმა ერთხელ ივსება თითო გაკვეთილზე, რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    useEffect(() => {
        if (formLessonId === lessonId || !lesson || lessonLoading) return;
        if (lesson.lessonId !== lessonId) return;
        const loaded = lessonToForm(lesson);
        setForm(loaded);
        setLoadedForm(loaded);
        setFormLessonId(lessonId);
    }, [formLessonId, lesson, lessonLoading, lessonId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setSaved(false);
    }, [dispatch, lessonId]);

    if (hasRight === false) return <h5>გაკვეთილების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !lesson || !form || formLessonId !== lessonId)
        return <Loading />;

    const hasUnsavedChanges =
        loadedForm !== null &&
        JSON.stringify(lessonFormToRequest(form)) !==
            JSON.stringify(lessonFormToRequest(loadedForm));

    const setField = (field: LessonField, value: string) => {
        setSaved(false);
        setForm((f) => (f ? { ...f, [field]: value } : f));
    };

    const setStudents = (
        change: (rows: ILessonStudentFormRow[]) => ILessonStudentFormRow[]
    ) => {
        setSaved(false);
        setForm((f) => (f ? { ...f, students: change(f.students) } : f));
    };

    const setStudentField = (
        index: number,
        field: StudentTextField | "present",
        value: string | boolean
    ) =>
        setStudents((rows) =>
            rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
        );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await updateLesson({
                lessonId,
                request: lessonFormToRequest(form),
            }).unwrap();
            //ფორმაში სერვერის შენახული მნიშვნელობები ჩანს (ცარიელი ტექსტი, trim)
            const loaded = lessonToForm(await refetch().unwrap());
            setForm(loaded);
            setLoadedForm(loaded);
            setSaved(true);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    function handleClose() {
        //სიიდან გახსნისას უკან, ფილტრით; პირდაპირ გახსნისას სიაზე
        if (location.key === "default") navigate(`/${lessonsMenuKey}`);
        else navigate(-1);
    }

    //ისრები ზემოთ/ქვემოთ და Enter ბადეში იმავე სვეტის მეზობელ სტრიქონზე გადადის (Enter ფორმას არ ინახავს)
    function handleGridKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
        const cell = parseCellKey(
            (e.target as HTMLElement).dataset?.lessonCell
        );
        if (!cell || !form) return;
        if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
        e.preventDefault();
        const target = targetCell(cell, e.key, e.shiftKey, form.students.length);
        if (!target) return;
        e.currentTarget
            .querySelector<HTMLElement>(`[data-lesson-cell="${cellKey(target)}"]`)
            ?.focus();
    }

    const neighbourButton = (
        targetId: number | null,
        caption: string,
        icon: "arrow-up" | "arrow-down"
    ) => (
        <Button
            variant="outline-secondary"
            className="me-2"
            disabled={targetId === null || hasUnsavedChanges}
            onClick={() => targetId !== null && navigate(lessonEditUrl(targetId))}
        >
            <FontAwesomeIcon icon={icon} /> {caption}
        </Button>
    );

    const readOnlyField = (id: string, caption: string, value: string) => (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={id}>{caption}</Form.Label>
            <Form.Control id={id} value={value} disabled readOnly />
        </Form.Group>
    );

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="6">
                    <h5>
                        გაკვეთილი: ჯგუფი{" "}
                        <Link to={`/${groupEditRoute}/${lesson.grpId}`}>
                            {lesson.groupCode}
                        </Link>
                        , {formatDateTime(lesson.lessonDt)} (ID {lesson.lessonId})
                    </h5>
                </Col>
                <Col sm="6" className="text-end">
                    {hasUnsavedChanges && (
                        <small className="text-muted me-2">
                            ჯერ შეინახეთ ცვლილებები
                        </small>
                    )}
                    {neighbourButton(
                        lesson.previousLessonId,
                        "წინა გაკვეთილი",
                        "arrow-up"
                    )}
                    {neighbourButton(
                        lesson.nextLessonId,
                        "შემდეგი გაკვეთილი",
                        "arrow-down"
                    )}
                </Col>
            </Row>

            <Row>
                <Col sm="2">
                    {readOnlyField(
                        "group",
                        "ჯგუფი",
                        `${lesson.groupCode} ${lesson.courseName}`
                    )}
                </Col>
                <Col sm="3">
                    {readOnlyField("teacher", "მასწავლებელი", lesson.teacherName)}
                </Col>
                <Col sm="2">
                    {readOnlyField(
                        "lessonDt",
                        "თარიღი და დრო",
                        formatDateTime(lesson.lessonDt)
                    )}
                </Col>
                <Col sm="2">
                    {readOnlyField("salaryScheme", "ხელფასის სქემა", lesson.salarySchemeName)}
                </Col>
                <Col sm="1">
                    {readOnlyField(
                        "fourWeekHours",
                        "4 კვ. საათები",
                        lesson.fourWeekHours.toString()
                    )}
                </Col>
                <Col sm="2">
                    {readOnlyField(
                        "teoDates",
                        "თეორიული თარიღები",
                        `${formatDate(lesson.teoMinDate)} – ${formatDate(lesson.teoMaxDate)}`
                    )}
                </Col>
            </Row>
            <Row className="mb-2">
                <Col sm="2">
                    <Form.Group>
                        <Form.Label htmlFor="lessonStatusId">სტატუსი</Form.Label>
                        <Form.Select
                            id="lessonStatusId"
                            required
                            value={form.lessonStatusId}
                            onChange={(e) =>
                                setField("lessonStatusId", e.target.value)
                            }
                        >
                            {lookups.lessonStatuses.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col sm="3">
                    <Form.Group>
                        <Form.Label htmlFor="substituteTeacherContractId">
                            შემცვლელი
                        </Form.Label>
                        <Form.Select
                            id="substituteTeacherContractId"
                            value={form.substituteTeacherContractId}
                            onChange={(e) =>
                                setField(
                                    "substituteTeacherContractId",
                                    e.target.value
                                )
                            }
                        >
                            <option value="">-- არ არის --</option>
                            {lookups.teacherContracts.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col sm="2">
                    <Form.Group>
                        <Form.Label htmlFor="teacherLateMinutes">
                            მასწ. დაგვიანება წთ.
                        </Form.Label>
                        <Form.Control
                            id="teacherLateMinutes"
                            type="number"
                            min={0}
                            step={1}
                            value={form.teacherLateMinutes}
                            onChange={(e) =>
                                setField("teacherLateMinutes", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                <Col sm="2">
                    <Form.Group>
                        <Form.Label htmlFor="recoverDate">აღდგენის თარიღი</Form.Label>
                        <Form.Control
                            id="recoverDate"
                            type="date"
                            value={form.recoverDate}
                            onChange={(e) =>
                                setField("recoverDate", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                <Col sm="3">
                    <Form.Group>
                        <Form.Label htmlFor="note">შენიშვნა</Form.Label>
                        <Form.Control
                            id="note"
                            maxLength={255}
                            value={form.note}
                            onChange={(e) => setField("note", e.target.value)}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-1">
                <Col>
                    <h6 className="d-inline me-3">
                        დასწრება და კომენტარები ({form.students.length})
                    </h6>
                    <Button
                        size="sm"
                        variant="outline-primary"
                        disabled={form.students.length === 0}
                        onClick={() => setStudents(markAllPresent)}
                    >
                        <FontAwesomeIcon icon="check-square" /> ყველა დაესწრო
                    </Button>
                    <small className="text-muted ms-3">
                        ↑ ↓ და Enter: იმავე სვეტის შემდეგი მოსწავლე
                    </small>
                </Col>
            </Row>
            <Table size="sm" bordered hover>
                <thead>
                    <tr>
                        <th>მოსწავლე</th>
                        <th>საათები</th>
                        <th>დაესწრო</th>
                        {textColumns.map(({ field, caption }) => (
                            <th key={field}>{caption}</th>
                        ))}
                        <th></th>
                    </tr>
                </thead>
                <tbody onKeyDown={handleGridKeyDown}>
                    {form.students.map((row, index) => (
                        <tr key={row.id}>
                            <td>{row.studentName}</td>
                            <td>{row.hoursCount}</td>
                            <td className="text-center">
                                <Form.Check
                                    aria-label={`${row.studentName}: დაესწრო`}
                                    data-lesson-cell={cellKey({ row: index, column: 0 })}
                                    checked={row.present}
                                    onChange={(e) =>
                                        setStudentField(index, "present", e.target.checked)
                                    }
                                />
                            </td>
                            {textColumns.map(({ field, caption }, columnIndex) => (
                                <td key={field}>
                                    <Form.Control
                                        size="sm"
                                        aria-label={`${row.studentName}: ${caption}`}
                                        data-lesson-cell={cellKey({
                                            row: index,
                                            column: columnIndex + 1,
                                        })}
                                        {...(field === "rate"
                                            ? { type: "number", step: "any" }
                                            : field === "studentLateMinutes"
                                              ? { type: "number", min: 0, step: 1 }
                                              : { maxLength: 255 })}
                                        value={row[field]}
                                        onChange={(e) =>
                                            setStudentField(index, field, e.target.value)
                                        }
                                    />
                                </td>
                            ))}
                            <td>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    tabIndex={-1}
                                    title="დასწრების, თემის, შეფასების და კომენტარების გასუფთავება"
                                    disabled={!hasEnteredData(row) && row.studentLateMinutes === "0"}
                                    onClick={() =>
                                        setStudents((rows) =>
                                            rows.map((r, i) =>
                                                i === index ? clearStudentRow(r) : r
                                            )
                                        )
                                    }
                                >
                                    გასუფთავება
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {saved && !hasUnsavedChanges && (
                <Alert variant="success">შენახულია</Alert>
            )}
            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button variant="secondary" className="me-2" onClick={handleClose}>
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving}>
                    <FontAwesomeIcon icon="save" /> შენახვა
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>
        </Form>
    );
};

export default LessonEdit;
