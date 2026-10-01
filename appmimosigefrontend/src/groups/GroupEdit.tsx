//GroupEdit.tsx

import { useEffect, useState, type FC } from "react";
import { Alert, Button, Col, Form, Row, Spinner, Tab, Tabs } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCreateGroupMutation,
    useDeleteGroupMutation,
    useGetGroupFormLookupsQuery,
    useGetGroupQuery,
    useGetGroupStudentContractsQuery,
    useUpdateGroupMutation,
} from "../redux/api/groupsApi";
import {
    groupFormToRequest,
    groupToForm,
    type IGroupForm,
    newGroupForm,
} from "./groupForm";
import {
    overlappingDayTimePlaceKeys,
    overlappingStudentKeys,
    overlappingTeacherKeys,
} from "./groupOverlaps";
import { groupsMenuKey, useHasGroupsRight } from "./groupsMenu";
import GroupTeachersTab from "./GroupTeachersTab";
import GroupStudentsTab from "./GroupStudentsTab";
import GroupDayTimePlacesTab from "./GroupDayTimePlacesTab";
import GroupLessonsGenerator from "../lessonGenerator/GroupLessonsGenerator";

type GroupTab = "teachers" | "students" | "dayTimePlaces";

type HeaderField =
    | "academicYearId"
    | "groupCode"
    | "courseId"
    | "groupSizeId"
    | "studentStatusId"
    | "voidDate";

//ფორმის პირველი არასწორი ველი. ფორმა noValidate-ია, რადგან დამალულ ჩანართში არასწორ ველს ბრაუზერი ვერ აჩვენებს
function firstInvalidControl(form: HTMLFormElement): HTMLInputElement | undefined {
    return Array.from(form.elements).find(
        (element): element is HTMLInputElement =>
            "validity" in element &&
            !(element as HTMLInputElement).disabled &&
            !(element as HTMLInputElement).validity.valid
    );
}

//Access-ის FrmGroups: ჯგუფი და მისი მასწავლებლები, მოსწავლეები და განრიგი (ჩანართები)
const GroupEdit: FC = () => {
    const { grpId: grpIdParam } = useParams<{ grpId: string }>();
    const grpId = grpIdParam ? Number(grpIdParam) : undefined;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const hasRight = useHasGroupsRight();

    const { data: lookups } = useGetGroupFormLookupsQuery(undefined, {
        skip: !hasRight,
    });
    const { data: group, isFetching: groupLoading } = useGetGroupQuery(
        grpId ?? 0,
        {
            skip: !hasRight || grpId === undefined,
            refetchOnMountOrArgChange: true,
        }
    );
    const [createGroup, { isLoading: creating }] = useCreateGroupMutation();
    const [updateGroup, { isLoading: updating }] = useUpdateGroupMutation();
    const [deleteGroup, { isLoading: deleting }] = useDeleteGroupMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [form, setForm] = useState<IGroupForm | null>(null);
    //ჩატვირთული ჯგუფი, შეუნახავი ცვლილებების გასარჩევად
    const [loadedForm, setLoadedForm] = useState<IGroupForm | null>(null);
    const [formKey, setFormKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<GroupTab>("teachers");
    const [invalidControl, setInvalidControl] =
        useState<HTMLInputElement | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    //მოსწავლის ასარჩევად: ჯგუფის სასწავლო წლის კონტრაქტები
    const academicYearId = form?.academicYearId
        ? Number(form.academicYearId)
        : undefined;
    const { data: studentContracts } = useGetGroupStudentContractsQuery(
        academicYearId ?? 0,
        { skip: !hasRight || academicYearId === undefined }
    );

    //ფორმა ერთხელ ივსება თითო ჩანაწერზე (ან ახალზე), რომ ხელახალმა ჩატვირთვამ შეყვანილი არ წაშალოს
    const currentKey = grpId === undefined ? "new" : `edit/${grpId}`;
    useEffect(() => {
        if (formKey === currentKey || !lookups) return;
        if (grpId === undefined) {
            setForm(newGroupForm(lookups.currentAcademicYearId));
            setFormKey(currentKey);
            setActiveTab("teachers");
        } else if (group && group.grpId === grpId && !groupLoading) {
            const loaded = groupToForm(group);
            setForm(loaded);
            setLoadedForm(loaded);
            setFormKey(currentKey);
            setActiveTab("teachers");
        }
    }, [currentKey, formKey, lookups, group, groupLoading, grpId]);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch, currentKey]);

    //არასწორი ველის ჩანართი უკვე გაიხსნა: ახლა ბრაუზერი ველს აჩვენებს
    useEffect(() => {
        if (!invalidControl) return;
        invalidControl.focus();
        invalidControl.reportValidity();
        setInvalidControl(null);
    }, [invalidControl]);

    if (hasRight === false) return <h5>ჯგუფების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!lookups || !form || formKey !== currentKey) return <Loading />;

    const teacherOverlaps = overlappingTeacherKeys(form.teachers);
    const studentOverlaps = overlappingStudentKeys(form.students);
    const dayTimePlaceOverlaps = overlappingDayTimePlaceKeys(form.dayTimePlaces);
    const hasUnsavedChanges =
        loadedForm !== null &&
        JSON.stringify(groupFormToRequest(form)) !==
            JSON.stringify(groupFormToRequest(loadedForm));

    const setField = (field: HeaderField, value: string) =>
        setForm((f) => (f ? { ...f, [field]: value } : f));

    const saving = creating || updating;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form) return;
        const invalid = firstInvalidControl(e.currentTarget);
        if (invalid) {
            const tab = invalid.closest<HTMLElement>("[data-group-tab]")?.dataset
                .groupTab as GroupTab | undefined;
            if (tab) setActiveTab(tab);
            setInvalidControl(invalid);
            return;
        }
        //გადაფარვისას სერვერიც უარს ამბობს (გენერატორის შეცდომები 5 და 7); გაფრთხილება ჩანართზე უკვე ჩანს
        if (teacherOverlaps.size > 0) {
            setActiveTab("teachers");
            return;
        }
        if (studentOverlaps.size > 0) {
            setActiveTab("students");
            return;
        }
        if (dayTimePlaceOverlaps.size > 0) {
            setActiveTab("dayTimePlaces");
            return;
        }
        dispatch(clearAlert(EAlertKind.ApiMutation));
        const request = groupFormToRequest(form);
        try {
            if (grpId === undefined) await createGroup(request).unwrap();
            else await updateGroup({ grpId, request }).unwrap();
            navigate(`/${groupsMenuKey}`);
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function handleDelete() {
        setShowDeleteConfirm(false);
        if (grpId === undefined) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await deleteGroup(grpId).unwrap();
            navigate(`/${groupsMenuKey}`);
        } catch {
            //მაგალითად, ჯგუფს უკვე აქვს გაკვეთილები
        }
    }

    const lookupSelect = (
        field: HeaderField,
        caption: string,
        items: { id: number; name: string }[]
    ) => (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={field}>{caption}</Form.Label>
            <Form.Select
                id={field}
                required
                value={form[field]}
                onChange={(e) => setField(field, e.target.value)}
            >
                <option value="">-- აირჩიეთ --</option>
                {items.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </Form.Select>
        </Form.Group>
    );

    return (
        <Form noValidate onSubmit={handleSubmit}>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>
                        {grpId === undefined
                            ? "ახალი ჯგუფი"
                            : `ჯგუფი ${group?.groupCode ?? ""}`}
                    </h5>
                </Col>
                <Col sm="4" className="text-end">
                    {grpId !== undefined && (
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

            {grpId !== undefined && (
                <GroupLessonsGenerator
                    grpId={grpId}
                    hasUnsavedChanges={hasUnsavedChanges}
                />
            )}

            <Row>
                <Col sm="2">
                    {lookupSelect(
                        "academicYearId",
                        "სასწ. წელი",
                        lookups.academicYears
                    )}
                </Col>
                <Col sm="2">
                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="groupCode">ჯგუფის კოდი</Form.Label>
                        <Form.Control
                            id="groupCode"
                            required
                            maxLength={5}
                            value={form.groupCode}
                            onChange={(e) =>
                                setField("groupCode", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                <Col sm="3">
                    {lookupSelect("courseId", "საგანი", lookups.courses)}
                </Col>
                <Col sm="2">
                    {lookupSelect(
                        "groupSizeId",
                        "ჯგუფის ზომა",
                        lookups.groupSizes
                    )}
                </Col>
                <Col sm="3">
                    {lookupSelect(
                        "studentStatusId",
                        "მოსწავლის სტატუსი",
                        lookups.studentStatuses
                    )}
                </Col>
            </Row>
            <Row className="mb-2">
                <Col sm="2">
                    <Form.Group>
                        <Form.Label htmlFor="voidDate">გაუქმება</Form.Label>
                        <Form.Control
                            id="voidDate"
                            type="date"
                            value={form.voidDate}
                            onChange={(e) =>
                                setField("voidDate", e.target.value)
                            }
                        />
                    </Form.Group>
                </Col>
                {grpId !== undefined && group && (
                    <Col sm="6" className="d-flex align-items-end">
                        <Form.Check
                            id="dirtyLessons"
                            type="checkbox"
                            disabled
                            checked={group.dirtyLessons}
                            label="საჭიროებს გაკვეთილების დაზუსტებას"
                        />
                    </Col>
                )}
            </Row>

            <Tabs
                activeKey={activeTab}
                onSelect={(key) => key && setActiveTab(key as GroupTab)}
                transition={false}
                className="mb-2"
            >
                <Tab
                    eventKey="teachers"
                    title={`მასწავლებლები (${form.teachers.length})`}
                >
                    <div data-group-tab="teachers">
                        <GroupTeachersTab
                            rows={form.teachers}
                            lookups={lookups}
                            overlapping={teacherOverlaps}
                            onChange={(teachers) =>
                                setForm((f) => (f ? { ...f, teachers } : f))
                            }
                        />
                    </div>
                </Tab>
                <Tab
                    eventKey="students"
                    title={`მოსწავლეები (${form.students.length})`}
                >
                    <div data-group-tab="students">
                        <GroupStudentsTab
                            rows={form.students}
                            contracts={studentContracts}
                            courseId={form.courseId}
                            groupSizeId={form.groupSizeId}
                            overlapping={studentOverlaps}
                            onChange={(students) =>
                                setForm((f) => (f ? { ...f, students } : f))
                            }
                        />
                    </div>
                </Tab>
                <Tab
                    eventKey="dayTimePlaces"
                    title={`განრიგი (${form.dayTimePlaces.length})`}
                >
                    <div data-group-tab="dayTimePlaces">
                        <GroupDayTimePlacesTab
                            rows={form.dayTimePlaces}
                            lookups={lookups}
                            overlapping={dayTimePlaceOverlaps}
                            onChange={(dayTimePlaces) =>
                                setForm((f) =>
                                    f ? { ...f, dayTimePlaces } : f
                                )
                            }
                        />
                    </div>
                </Tab>
            </Tabs>

            {(teacherOverlaps.size > 0 ||
                studentOverlaps.size > 0 ||
                dayTimePlaceOverlaps.size > 0) && (
                <Alert variant="warning">
                    ჯგუფი არ შეინახება, სანამ მასწავლებლების, ერთი მოსწავლის
                    ან განრიგის პერიოდები ერთმანეთს ფარავს
                </Alert>
            )}

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <div className="text-end">
                <Button
                    variant="secondary"
                    className="me-2"
                    onClick={() => navigate(`/${groupsMenuKey}`)}
                >
                    <FontAwesomeIcon icon="window-close" /> დახურვა
                </Button>
                <Button type="submit" disabled={saving}>
                    <FontAwesomeIcon icon="save" />
                    {grpId === undefined ? " შექმნა" : " შენახვა"}
                    {saving && <Spinner size="sm" animation="border" />}
                </Button>
            </div>

            <MessageBox
                show={showDeleteConfirm}
                title="იშლება ჯგუფი"
                text={`დარწმუნებული ხართ, რომ გსურთ წაშალოთ ჯგუფი "${form.groupCode}" მასწავლებლებთან, მოსწავლეებთან და განრიგთან ერთად?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={handleDelete}
                onClosed={() => setShowDeleteConfirm(false)}
            />
        </Form>
    );
};

export default GroupEdit;
