//CrmCallFields.tsx

import type { FC } from "react";
import { Col, Form, Row } from "react-bootstrap";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import type { ICrmCallForm } from "./crmCallForm";

type CrmCallFieldsProps = {
    form: ICrmCallForm;
    callTypes: ILookupItem[];
    answerTypes: ILookupItem[];
    onChange: <K extends keyof ICrmCallForm>(field: K, value: ICrmCallForm[K]) => void;
};

//ზარის ველები კონტრაქტის გარდა (Access-ის FrmCRMCalls): ტიპი, თარიღი და დრო, შედეგი, საუბრის შინაარსი, "უნდა
//გადაიხადოს თარიღამდე". ზარის ფორმაც და ბალანსების გვერდის ზარის ფანჯარაც იყენებს
const CrmCallFields: FC<CrmCallFieldsProps> = ({ form, callTypes, answerTypes, onChange }) => (
    <>
        <Row>
            <Col sm="5">
                <Form.Group className="mb-2">
                    <Form.Label htmlFor="callTypeId">ზარის ტიპი</Form.Label>
                    <Form.Select
                        id="callTypeId"
                        required
                        value={form.callTypeId}
                        onChange={(e) => onChange("callTypeId", e.target.value)}
                    >
                        <option value="">-- აირჩიეთ --</option>
                        {callTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Col>
            <Col sm="3">
                <Form.Group className="mb-2">
                    <Form.Label htmlFor="callDate">თარიღი და დრო</Form.Label>
                    <Form.Control
                        id="callDate"
                        type="datetime-local"
                        required
                        value={form.callDate}
                        onChange={(e) => onChange("callDate", e.target.value)}
                    />
                </Form.Group>
            </Col>
            <Col sm="4">
                <Form.Group className="mb-2">
                    <Form.Label htmlFor="answerTypeId">შედეგი</Form.Label>
                    <Form.Select
                        id="answerTypeId"
                        required
                        value={form.answerTypeId}
                        onChange={(e) => onChange("answerTypeId", e.target.value)}
                    >
                        <option value="">-- აირჩიეთ --</option>
                        {answerTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Col>
        </Row>
        <Row>
            <Col sm="9">
                <Form.Group className="mb-2">
                    <Form.Label htmlFor="callConversation">საუბრის შინაარსი</Form.Label>
                    <Form.Control
                        id="callConversation"
                        as="textarea"
                        rows={3}
                        value={form.callConversation}
                        onChange={(e) => onChange("callConversation", e.target.value)}
                    />
                </Form.Group>
            </Col>
            <Col sm="3">
                <Form.Group className="mb-2">
                    <Form.Label htmlFor="mustPayDate">უნდა გადაიხადოს თარიღამდე</Form.Label>
                    <Form.Control
                        id="mustPayDate"
                        type="date"
                        value={form.mustPayDate}
                        onChange={(e) => onChange("mustPayDate", e.target.value)}
                    />
                </Form.Group>
            </Col>
        </Row>
    </>
);

export default CrmCallFields;
