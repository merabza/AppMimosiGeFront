//Salary.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import {
    useDownloadDeclarationFileMutation,
    useGetSalaryHeadersQuery,
} from "../redux/api/salaryApi";
import { formatDate } from "../studentContracts/dateFormat";
import { formatMoney, previousMonthInputValue } from "./salaryForm";
import { salaryEditUrl, useHasSalaryRight } from "./salaryMenu";

//Access-ის FrmSalary-ის უწყისები (დარიცხვის თარიღით) და დეკლარაციის ფაილი თვის მიხედვით
const Salary: FC = () => {
    const dispatch = useAppDispatch();
    const hasRight = useHasSalaryRight();
    const { data: headers } = useGetSalaryHeadersQuery(undefined, { skip: !hasRight });
    const [downloadDeclaration, { isLoading: downloading }] = useDownloadDeclarationFileMutation();
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);
    const [month, setMonth] = useState(previousMonthInputValue);

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch]);

    if (hasRight === false) return <h5>ხელფასების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (!headers) return <Loading />;

    async function handleDeclaration(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        dispatch(clearAlert(EAlertKind.ApiMutation));
        try {
            await downloadDeclaration(month).unwrap();
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    return (
        <div>
            <Row className="mb-2">
                <Col sm="8">
                    <h5>ხელფასები</h5>
                </Col>
                <Col sm="4" className="text-end">
                    <Link to={salaryEditUrl()} className="btn btn-primary">
                        <FontAwesomeIcon icon="plus" /> ახალი უწყისი
                    </Link>
                </Col>
            </Row>

            <Table striped bordered hover size="sm">
                <thead>
                    <tr>
                        <th>დარიცხვის თარიღი</th>
                        <th>გადარიცხვის თარიღი</th>
                        <th className="text-end">სტრიქონები</th>
                        <th className="text-end">გადასარიცხი</th>
                    </tr>
                </thead>
                <tbody>
                    {headers.map((header) => (
                        <tr key={header.shId}>
                            <td>
                                <Link to={salaryEditUrl(header.shId)}>{formatDate(header.shChargeDate)}</Link>
                            </td>
                            <td>{formatDate(header.shTransferDate)}</td>
                            <td className="text-end">{header.linesCount}</td>
                            <td className="text-end">{formatMoney(header.amountNetSum)}</td>
                        </tr>
                    ))}
                    {headers.length === 0 && (
                        <tr>
                            <td colSpan={4}>უწყისები არ არის</td>
                        </tr>
                    )}
                </tbody>
            </Table>

            <Form onSubmit={handleDeclaration}>
                <Row className="align-items-end">
                    <Col sm="3">
                        <Form.Group>
                            <Form.Label htmlFor="declarationMonth">დეკლარაციის თვე</Form.Label>
                            <Form.Control
                                id="declarationMonth"
                                type="month"
                                required
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col sm="5">
                        <Button type="submit" disabled={downloading || month === ""}>
                            <FontAwesomeIcon icon="file-export" /> დეკლარაციის ფაილის მომზადება
                            {downloading && <Spinner size="sm" animation="border" />}
                        </Button>
                    </Col>
                </Row>
                <Form.Text>
                    ყველა უწყისის სტრიქონი, რომლის გადარიცხვის თარიღი ამ თვეშია
                </Form.Text>
            </Form>

            <AlertMessages alertKind={EAlertKind.ApiMutation} />
        </div>
    );
};

export default Salary;
