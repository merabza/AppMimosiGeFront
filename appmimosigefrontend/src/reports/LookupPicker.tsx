//LookupPicker.tsx

import { useState, type FC } from "react";
import { Button, Form, InputGroup, ListGroup } from "react-bootstrap";
import { matchesSearch } from "../payments/contractSearch";
import type { ILookupItem } from "../redux/types/studentContractsTypes";

type LookupPickerProps = {
    id: string;
    label: string;
    items: ILookupItem[];
    //არჩეულის ID სტრიქონად, ცარიელი = ყველა
    value: string;
    onChange: (value: string) => void;
};

//რეპორტის ფილტრის ძებნადი არჩევა (Access-ის FrmMain-ის cmbTeacherID, cmbCourceID, cmbStudentID): სიაში ძებნა
//სახელის ყოველი სიტყვით, ნებისმიერი რიგით; ცარიელი ფილტრი ყველას ნიშნავს და არჩეული × ღილაკით მოიხსნება
const LookupPicker: FC<LookupPickerProps> = ({ id, label, items, value, onChange }) => {
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);

    const selectedName = items.find((item) => item.id.toString() === value)?.name ?? "";
    const matches = searching ? items.filter((item) => matchesSearch(item.name, search)) : [];

    function choose(item: ILookupItem) {
        onChange(item.id.toString());
        setSearching(false);
    }

    return (
        <Form.Group className="mb-2 position-relative">
            <Form.Label htmlFor={id}>{label}</Form.Label>
            <InputGroup>
                <Form.Control
                    id={id}
                    autoComplete="off"
                    placeholder="ყველა"
                    value={searching ? search : selectedName}
                    onFocus={() => {
                        setSearching(true);
                        setSearch("");
                    }}
                    onBlur={() => setTimeout(() => setSearching(false), 200)}
                    onChange={(e) => {
                        setSearching(true);
                        setSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        //Enter ფორმას არ აგზავნის; ერთადერთი ნაპოვნი აირჩევა
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (matches.length === 1) choose(matches[0]);
                    }}
                />
                {value !== "" && (
                    <Button variant="outline-secondary" title={`${label}: ფილტრის მოხსნა`} onClick={() => onChange("")}>
                        ×
                    </Button>
                )}
            </InputGroup>
            {searching && (
                <ListGroup className="position-absolute" style={{ zIndex: 10, maxHeight: "20rem", overflowY: "auto" }}>
                    {matches.length === 0 && <ListGroup.Item>ვერ მოიძებნა</ListGroup.Item>}
                    {matches.map((item) => (
                        <ListGroup.Item
                            key={item.id}
                            action
                            onMouseDown={(e) => {
                                //onBlur-მდე უნდა მოესწროს
                                e.preventDefault();
                                choose(item);
                            }}
                        >
                            {item.name}
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </Form.Group>
    );
};

export default LookupPicker;
