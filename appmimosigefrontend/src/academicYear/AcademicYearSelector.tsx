//AcademicYearSelector.tsx

import type { FC } from "react";
import { Form } from "react-bootstrap";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { useGetAcademicYearsQuery } from "../redux/api/academicYearApi";
import { setSelectedAcademicYearId } from "../redux/slices/academicYearSlice";
import { pickAcademicYearId, useSelectedAcademicYearId } from "./academicYearChoice";

//ზედა მენიუს სასწავლო წელი (ნაწილი 20): სიების (კონტრაქტები, ჯგუფები, გაკვეთილები, გადახდები, CRM, ბალანსები,
//შემოწმების რეპორტები) წლის ფილტრის ნაგულისხმევი. მიმდინარე წლის არჩევა არჩევანს შლის, ამიტომ ახალი წლის დადგომისას
//ნაგულისხმევი თავისით გადადის
const AcademicYearSelector: FC = () => {
    const dispatch = useAppDispatch();
    const selectedAcademicYearId = useSelectedAcademicYearId();
    const { data } = useGetAcademicYearsQuery();

    if (!data || data.academicYears.length === 0) return null;

    const value = pickAcademicYearId(selectedAcademicYearId, data.currentAcademicYearId, data.academicYears);

    function handleChange(academicYearId: number) {
        dispatch(setSelectedAcademicYearId(academicYearId === data?.currentAcademicYearId ? null : academicYearId));
    }

    return (
        <Form.Group className="d-flex align-items-center ms-auto me-2">
            <Form.Label htmlFor="globalAcademicYear" className="mb-0 me-2 text-nowrap">
                სასწავლო წელი
            </Form.Label>
            <Form.Select
                id="globalAcademicYear"
                size="sm"
                value={value ?? ""}
                onChange={(e) => handleChange(Number(e.target.value))}
            >
                {data.academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                        {ay.id === data.currentAcademicYearId ? `${ay.name} (მიმდინარე)` : ay.name}
                    </option>
                ))}
            </Form.Select>
        </Form.Group>
    );
};

export default AcademicYearSelector;
