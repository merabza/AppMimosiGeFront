//academicYearSlice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

//გლობალური სასწავლო წელი (ნაწილი 20): ზედა მენიუში არჩეული წელი სიების წლის ფილტრის ნაგულისხმევია.
//null: არ არის არჩეული, მაშინ მიმდინარე წელი მოქმედებს. არჩევანი ბრაუზერში ინახება
export const selectedAcademicYearStorageKey = "selectedAcademicYearId";

export interface IAcademicYearState {
    selectedAcademicYearId: number | null;
}

export function readSelectedAcademicYearId(): number | null {
    try {
        const value = Number(localStorage.getItem(selectedAcademicYearStorageKey));
        return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

function storeSelectedAcademicYearId(academicYearId: number | null) {
    try {
        if (academicYearId === null) localStorage.removeItem(selectedAcademicYearStorageKey);
        else localStorage.setItem(selectedAcademicYearStorageKey, academicYearId.toString());
    } catch {
        //ბრაუზერის საცავი შეიძლება მიუწვდომელი იყოს: არჩევანი მხოლოდ ამ სესიაში დარჩება
    }
}

const academicYearSlice = createSlice({
    name: "academicYear",
    initialState: (): IAcademicYearState => ({ selectedAcademicYearId: readSelectedAcademicYearId() }),
    reducers: {
        setSelectedAcademicYearId(state, action: PayloadAction<number | null>) {
            state.selectedAcademicYearId = action.payload;
            storeSelectedAcademicYearId(action.payload);
        },
    },
});

export const { setSelectedAcademicYearId } = academicYearSlice.actions;
export default academicYearSlice.reducer;
