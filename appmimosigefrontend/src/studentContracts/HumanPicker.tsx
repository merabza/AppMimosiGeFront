//HumanPicker.tsx

import { useEffect, useState, type FC } from "react";
import { Form, InputGroup, ListGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLazySearchHumansQuery } from "../redux/api/studentContractsApi";
import type { ILookupItem } from "../redux/types/studentContractsTypes";

//ძებნა სერვერზე 2 სიმბოლოდან იწყება (SearchHumansQueryHandler.MinSearchLength)
const minSearchLength = 2;

//ძებნის lazy query-ის hook: ყოველ გვერდს თავისი endpoint-ი აქვს, რომ მისი მენიუს უფლება შემოწმდეს
export type SearchHumansHook = () => readonly [
    (search: string) => unknown,
    { data?: ILookupItem[]; isFetching: boolean },
    ...unknown[],
];

type HumanPickerProps = {
    id: string;
    label: string;
    humanId: number;
    humanName: string;
    onChange: (humanId: number, humanName: string) => void;
    useSearchHumans?: SearchHumansHook;
};

//ადამიანის ძებნადი არჩევა გვარ-სახელით ან პირადი ნომრის დასაწყისით.
//ახალი ადამიანი ემატება ადამიანების სიის ფორმაში (ახალ ჩანართში), შემდეგ აქ მოიძებნება
const HumanPicker: FC<HumanPickerProps> = (props) => {
    const {
        id,
        label,
        humanId,
        humanName,
        onChange,
        useSearchHumans = useLazySearchHumansQuery,
    } = props;
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchHumans, { data: humans, isFetching }] = useSearchHumans();

    useEffect(() => {
        if (!searching || search.trim().length < minSearchLength) return;
        const timer = setTimeout(() => searchHumans(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search, searching, searchHumans]);

    return (
        <Form.Group className="mb-2">
            <Form.Label htmlFor={id}>{label}</Form.Label>
            <InputGroup>
                <Form.Control
                    id={id}
                    autoComplete="off"
                    placeholder="გვარი სახელი ან პირადი ნომერი"
                    value={searching ? search : humanName}
                    isInvalid={!searching && humanId === 0}
                    onFocus={() => {
                        setSearching(true);
                        setSearch("");
                    }}
                    onBlur={() => setTimeout(() => setSearching(false), 200)}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Link
                    className="btn btn-outline-secondary"
                    to="/mdItemEdit/Humans"
                    target="_blank"
                    title="ახალი ადამიანის დამატება (იხსნება ახალ ჩანართში)"
                >
                    <FontAwesomeIcon icon="user-plus" />
                </Link>
            </InputGroup>
            {searching && search.trim().length >= minSearchLength && (
                <ListGroup className="position-absolute" style={{ zIndex: 10 }}>
                    {isFetching && <ListGroup.Item>იძებნება...</ListGroup.Item>}
                    {!isFetching && humans?.length === 0 && (
                        <ListGroup.Item>ვერ მოიძებნა</ListGroup.Item>
                    )}
                    {!isFetching &&
                        humans?.map((human) => (
                            <ListGroup.Item
                                key={human.id}
                                action
                                onMouseDown={(e) => {
                                    //onBlur-მდე უნდა მოესწროს
                                    e.preventDefault();
                                    onChange(human.id, human.name);
                                    setSearching(false);
                                }}
                            >
                                {human.name}
                            </ListGroup.Item>
                        ))}
                </ListGroup>
            )}
        </Form.Group>
    );
};

export default HumanPicker;
