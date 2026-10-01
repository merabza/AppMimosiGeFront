//StudentContractPicker.tsx

import { useEffect, useRef, useState, type FC } from "react";
import { Button, Form, InputGroup, ListGroup } from "react-bootstrap";
import { useGetPaymentStudentContractsQuery } from "../redux/api/paymentsApi";
import type { ILookupItem } from "../redux/types/studentContractsTypes";
import { matchesSearch } from "./contractSearch";

//წლის კონტრაქტების query-ის hook: ყოველ გვერდს თავისი endpoint-ი აქვს, რომ მისი მენიუს უფლება შემოწმდეს
export type StudentContractsHook = (
    academicYearId: number,
    options: { skip: boolean }
) => { data?: ILookupItem[]; isFetching: boolean };

type StudentContractPickerProps = {
    id: string;
    label: string;
    academicYears: ILookupItem[];
    academicYearId: string;
    studentContractId: string;
    //სახელი, სანამ წლის კონტრაქტები იტვირთება (მაგ. გახსნილი გადახდის კონტრაქტი)
    contractName?: string;
    //ფორმაში კონტრაქტი სავალდებულოა; ფილტრში ცარიელი ყველა მოსწავლეს ნიშნავს და არჩეული მოიხსნება
    required?: boolean;
    disabled?: boolean;
    //წლის შეცვლისას მშობელი არჩეულ კონტრაქტს ასუფთავებს: ის სხვა წლისაა
    onYearChange: (academicYearId: string) => void;
    onContractChange: (studentContractId: string) => void;
    useStudentContracts?: StudentContractsHook;
};

//მოსწავლის კონტრაქტის ძებნადი არჩევა სასწავლო წლის კონტრაქტებიდან ("გვარი სახელი ნომერი", როგორც Access-ის
//ჩამოსაშლელ სიაში). წლის კონტრაქტები ერთხელ იტვირთება და ძებნა ბრაუზერში ხდება
const StudentContractPicker: FC<StudentContractPickerProps> = (props) => {
    const {
        id,
        label,
        academicYears,
        academicYearId,
        studentContractId,
        contractName,
        required = false,
        disabled = false,
        onYearChange,
        onContractChange,
        useStudentContracts = useGetPaymentStudentContractsQuery,
    } = props;
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { data: contracts, isFetching } = useStudentContracts(
        Number(academicYearId),
        { skip: academicYearId === "" }
    );

    //ბრაუზერის ფორმის შემოწმება: არჩევის გარეშე სავალდებულო ფორმა არ იგზავნება
    useEffect(() => {
        inputRef.current?.setCustomValidity(
            required && studentContractId === ""
                ? "აირჩიეთ მოსწავლის კონტრაქტი"
                : ""
        );
    }, [required, studentContractId]);

    const selectedName =
        studentContractId === ""
            ? ""
            : (contracts?.find((c) => c.id.toString() === studentContractId)
                  ?.name ??
              contractName ??
              "");
    const matches = searching
        ? (contracts ?? []).filter((c) => matchesSearch(c.name, search))
        : [];

    function choose(contract: ILookupItem) {
        onContractChange(contract.id.toString());
        setSearching(false);
    }

    return (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={id}>{label}</Form.Label>
            <InputGroup>
                <Form.Select
                    aria-label={`${label}: სასწავლო წელი`}
                    style={{ maxWidth: "9rem" }}
                    value={academicYearId}
                    disabled={disabled}
                    onChange={(e) => onYearChange(e.target.value)}
                >
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.name}
                        </option>
                    ))}
                </Form.Select>
                <Form.Control
                    id={id}
                    ref={inputRef}
                    autoComplete="off"
                    placeholder="გვარი სახელი ან კონტრაქტის ნომერი"
                    value={searching ? search : selectedName}
                    isInvalid={required && !searching && studentContractId === ""}
                    disabled={disabled}
                    onFocus={() => {
                        setSearching(true);
                        setSearch("");
                    }}
                    onBlur={() => setTimeout(() => setSearching(false), 200)}
                    onChange={(e) => {
                        //არჩევის შემდეგ ველი ფოკუსში რჩება: აკრეფა ძებნას თავიდან იწყებს
                        setSearching(true);
                        setSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        //Enter ფორმას არ ინახავს; ერთადერთი ნაპოვნი კონტრაქტი აირჩევა
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (matches.length === 1) choose(matches[0]);
                    }}
                />
                {!required && studentContractId !== "" && (
                    <Button
                        variant="outline-secondary"
                        title="მოსწავლის ფილტრის მოხსნა"
                        disabled={disabled}
                        onClick={() => onContractChange("")}
                    >
                        ×
                    </Button>
                )}
            </InputGroup>
            {searching && (
                <ListGroup
                    className="position-absolute"
                    style={{ zIndex: 10, maxHeight: "20rem", overflowY: "auto" }}
                >
                    {isFetching && <ListGroup.Item>იტვირთება...</ListGroup.Item>}
                    {!isFetching && matches.length === 0 && (
                        <ListGroup.Item>ვერ მოიძებნა</ListGroup.Item>
                    )}
                    {!isFetching &&
                        matches.map((contract) => (
                            <ListGroup.Item
                                key={contract.id}
                                action
                                onMouseDown={(e) => {
                                    //onBlur-მდე უნდა მოესწროს
                                    e.preventDefault();
                                    choose(contract);
                                }}
                            >
                                {contract.name}
                            </ListGroup.Item>
                        ))}
                </ListGroup>
            )}
        </Form.Group>
    );
};

export default StudentContractPicker;
