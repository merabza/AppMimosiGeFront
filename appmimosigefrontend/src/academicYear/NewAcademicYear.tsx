//NewAcademicYear.tsx

import { useEffect, useState, type FC } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import MessageBox from "../appcarcass/common/MessageBox";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useCloseAcademicYearGroupsMutation,
    useCreateAcademicYearMutation,
    useGetAcademicYearWizardInfoQuery,
} from "../redux/api/academicYearApi";
import type { ICloseAcademicYearGroups, INewAcademicYear } from "../redux/types/academicYearTypes";
import { formatDate, toDateInputValue } from "../studentContracts/dateFormat";
import { formatMoney } from "../salary/salaryForm";
import { useHasNewAcademicYearRight } from "./academicYearMenu";
import { closeGroupsTotals, defaultYearToClose, extraLessonWithDataErrorCode } from "./newAcademicYearWizard";

//„ახალი სასწავლო წლის" ოსტატი (ნაწილი 20): 1) მომდევნო წლის დამატება, 2) წინა წლის ჯგუფების დახურვა. ყოველი ნაბიჯი
//ჯერ გადახედვით (dry-run) ეშვება, შესრულება კი დადასტურებას ითხოვს. კონტრაქტები და ახალი ჯგუფები ხელით იქმნება,
//ნაშთები არ გადაიტანება: ბალანსი მოსწავლის ყველა წლის კონტრაქტის ჯამია
const NewAcademicYear: FC = () => {
    const dispatch = useAppDispatch();
    const hasRight = useHasNewAcademicYearRight();
    const { data: info } = useGetAcademicYearWizardInfoQuery(undefined, { skip: !hasRight });
    const [createAcademicYear, { isLoading: creating }] = useCreateAcademicYearMutation();
    const [closeGroups, { isLoading: closing }] = useCloseAcademicYearGroupsMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    const [newYear, setNewYear] = useState<INewAcademicYear | null>(null);
    const [closeAyId, setCloseAyId] = useState<number | null>(null);
    const [closeDate, setCloseDate] = useState("");
    const [closeResult, setCloseResult] = useState<ICloseAcademicYearGroups | null>(null);
    const [showCreateConfirm, setShowCreateConfirm] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch]);

    //დასახურავი წელი და თარიღი ერთხელ ივსება, წლების ჩატვირთვისას
    useEffect(() => {
        if (!info || closeAyId !== null) return;
        const year = defaultYearToClose(info.academicYears);
        if (!year) return;
        setCloseAyId(year.ayId);
        setCloseDate(toDateInputValue(year.finishDate));
    }, [info, closeAyId]);

    if (hasRight === false) return <h5>ახალი სასწავლო წლის დამატების უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!info) return <Loading />;

    async function runCreate(dryRun: boolean) {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            const result = await createAcademicYear(dryRun).unwrap();
            setNewYear(result);
            //დამატებული წლის შემდეგ დასახურავი ნაგულისხმევად მისი წინა წელია: ის თავიდან აირჩევა
            if (!result.dryRun) {
                setCloseAyId(null);
                setCloseResult(null);
            }
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    async function runClose(dryRun: boolean) {
        if (closeAyId === null) return;
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            setCloseResult(await closeGroups({ ayId: closeAyId, closeDate, dryRun }).unwrap());
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    function handleCloseYearChange(ayId: number) {
        setCloseAyId(ayId);
        setCloseDate(toDateInputValue(info?.academicYears.find((ay) => ay.ayId === ayId)?.finishDate));
        setCloseResult(null);
    }

    const totals = closeResult ? closeGroupsTotals(closeResult) : null;
    const closeYearName = info.academicYears.find((ay) => ay.ayId === closeAyId)?.academicYearName ?? "";

    return (
        <div>
            <h5>ახალი სასწავლო წელი</h5>

            <Table striped bordered size="sm">
                <thead>
                    <tr>
                        <th>სასწავლო წელი</th>
                        <th>დაწყება</th>
                        <th>დასრულება</th>
                        <th className="text-end">კონტრაქტები</th>
                        <th className="text-end">ჯგუფები</th>
                        <th className="text-end">დაუხურავი ჯგუფები</th>
                    </tr>
                </thead>
                <tbody>
                    {info.academicYears.map((ay) => (
                        <tr key={ay.ayId}>
                            <td>
                                {ay.academicYearName}
                                {ay.ayId === info.currentAcademicYearId && " (მიმდინარე)"}
                            </td>
                            <td>{formatDate(ay.startDate)}</td>
                            <td>{formatDate(ay.finishDate)}</td>
                            <td className="text-end">{ay.studentContractsCount}</td>
                            <td className="text-end">{ay.groupsCount}</td>
                            <td className="text-end">{ay.openGroupsCount}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <p>
                ბოლო სამუშაო თვე: {formatDate(info.lastOperationMonth)}, გაკვეთილები იქმნება{" "}
                {formatDate(info.horizonEnd)}-მდე. თვეებს გენერატორი თავად ამატებს (დღეს + 2 თვემდე).
            </p>

            <Card className="mb-3">
                <Card.Header>1. სასწავლო წლის დამატება</Card.Header>
                <Card.Body>
                    <p>მიმდინარე წლის მომდევნო წელი. კონტრაქტები და ახალი ჯგუფები ხელით იქმნება.</p>
                    <Button className="me-2" variant="secondary" disabled={creating} onClick={() => runCreate(true)}>
                        <FontAwesomeIcon icon="microscope" /> გადახედვა
                    </Button>
                    <Button
                        disabled={creating || !newYear || newYear.alreadyExists || !newYear.dryRun}
                        onClick={() => setShowCreateConfirm(true)}
                    >
                        <FontAwesomeIcon icon="plus" /> წლის დამატება
                        {creating && <Spinner size="sm" animation="border" />}
                    </Button>
                    {newYear && (
                        <Alert className="mt-3 mb-0" variant={newYear.alreadyExists ? "warning" : "info"}>
                            {newYear.dryRun ? "დაემატება" : "დაემატა"} სასწავლო წელი{" "}
                            <strong>{newYear.academicYearName}</strong>: {formatDate(newYear.startDate)} –{" "}
                            {formatDate(newYear.finishDate)}, კონტრაქტის ნომრები {newYear.contractNumberPrefix}.001-დან.
                            {newYear.alreadyExists && " ეს წელი უკვე არსებობს."}
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            <Card className="mb-3">
                <Card.Header>2. წინა წლის ჯგუფების დახურვა</Card.Header>
                <Card.Body>
                    <p>
                        წლის დაუხურავ ჯგუფებს გაუქმების თარიღი ესმება, გენერატორი კი ამ თარიღიდან შეუვსებელ გაკვეთილებს
                        შლის. შეტანილი მონაცემით გაკვეთილი რჩება და გენერატორის ლოგში ჩანს.
                    </p>
                    <Row className="align-items-end mb-2">
                        <Col sm="3">
                            <Form.Label htmlFor="closeAcademicYear">სასწავლო წელი</Form.Label>
                            <Form.Select
                                id="closeAcademicYear"
                                value={closeAyId ?? ""}
                                onChange={(e) => handleCloseYearChange(Number(e.target.value))}
                            >
                                {info.academicYears.map((ay) => (
                                    <option key={ay.ayId} value={ay.ayId}>
                                        {ay.academicYearName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col sm="3">
                            <Form.Label htmlFor="closeDate">გაუქმების თარიღი</Form.Label>
                            <Form.Control
                                id="closeDate"
                                type="date"
                                required
                                value={closeDate}
                                onChange={(e) => {
                                    setCloseDate(e.target.value);
                                    setCloseResult(null);
                                }}
                            />
                        </Col>
                        <Col sm="6">
                            <Button
                                className="me-2"
                                variant="secondary"
                                disabled={closing || closeAyId === null || closeDate === ""}
                                onClick={() => runClose(true)}
                            >
                                <FontAwesomeIcon icon="microscope" /> გადახედვა
                            </Button>
                            <Button
                                variant="danger"
                                disabled={closing || !closeResult || !closeResult.dryRun || closeResult.groups.length === 0}
                                onClick={() => setShowCloseConfirm(true)}
                            >
                                <FontAwesomeIcon icon="check" /> ჯგუფების დახურვა
                                {closing && <Spinner size="sm" animation="border" />}
                            </Button>
                        </Col>
                    </Row>
                    {closeResult && totals && (
                        <div>
                            <Alert variant="info">
                                {closeResult.dryRun ? "დაიხურება" : "დაიხურა"} {totals.groupsCount} ჯგუფი{" "}
                                {formatDate(closeResult.closeDate)}-ით. {closeResult.dryRun ? "წაიშლება" : "წაიშალა"}{" "}
                                {totals.deletedLessonsCount} გაკვეთილი (დარიცხვა {formatMoney(totals.deletedLessonsCharges)}),
                                შეტანილი მონაცემით რჩება{" "}
                                {totals.keptLessonsCount}; დაუსრულებელი სტრიქონები: {totals.openRowsCount}.
                            </Alert>
                            {closeResult.groups.length > 0 && (
                                <Table striped bordered hover size="sm">
                                    <thead>
                                        <tr>
                                            <th>ჯგუფი</th>
                                            <th>საგანი</th>
                                            <th>ძველი გაუქმება</th>
                                            <th className="text-end">მასწ. / მოსწ. / განრიგი</th>
                                            <th className="text-end">წაიშლება</th>
                                            <th className="text-end">რჩება</th>
                                            <th className="text-end">დარიცხვა</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {closeResult.groups.map((group) => (
                                            <tr key={group.grpId}>
                                                <td>{group.groupCode}</td>
                                                <td>{group.courseName}</td>
                                                <td>{formatDate(group.previousVoidDate)}</td>
                                                <td className="text-end">
                                                    {group.openTeacherRowsCount} / {group.openStudentRowsCount} /{" "}
                                                    {group.openScheduleRowsCount}
                                                </td>
                                                <td className="text-end">{group.generation.deletedLessonsCount}</td>
                                                <td className="text-end">
                                                    {
                                                        group.generation.errors.filter(
                                                            (e) => e.errorCode === extraLessonWithDataErrorCode
                                                        ).length
                                                    }
                                                </td>
                                                <td className="text-end">{formatMoney(group.deletedLessonsCharges)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />

            <MessageBox
                show={showCreateConfirm}
                title="სასწავლო წლის დამატება"
                text={`დაემატება სასწავლო წელი ${newYear?.academicYearName ?? ""}. გავაგრძელო?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={() => runCreate(false)}
                onClosed={() => setShowCreateConfirm(false)}
            />
            <MessageBox
                show={showCloseConfirm}
                title="ჯგუფების დახურვა"
                text={`${closeYearName} წლის ${totals?.groupsCount ?? 0} ჯგუფი დაიხურება და ${
                    totals?.deletedLessonsCount ?? 0
                } გაკვეთილი წაიშლება. გავაგრძელო?`}
                primaryButtonText="დიახ"
                secondaryButtonText="არა"
                onConfirmed={() => runClose(false)}
                onClosed={() => setShowCloseConfirm(false)}
            />
        </div>
    );
};

export default NewAcademicYear;
