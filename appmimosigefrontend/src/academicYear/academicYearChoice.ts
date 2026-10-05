//academicYearChoice.ts

import { useAppSelector } from "../appcarcass/redux/hooks";
import type { RootState } from "../redux/store";
import type { ILookupItem } from "../redux/types/studentContractsTypes";

//სიის ნაგულისხმევი წელი: გლობალურად არჩეული, თუ ის ამ სიის წლებშია, თორემ მიმდინარე (D47)
export function pickAcademicYearId(
    selectedAcademicYearId: number | null,
    currentAcademicYearId: number | null,
    academicYears: ILookupItem[]
): number | null {
    if (selectedAcademicYearId !== null && academicYears.some((ay) => ay.id === selectedAcademicYearId))
        return selectedAcademicYearId;
    return currentAcademicYearId;
}

//გლობალურად არჩეული წელი; გვერდების სატესტო store-ებს ეს slice შეიძლება არ ჰქონდეს
export function useSelectedAcademicYearId(): number | null {
    return useAppSelector(
        (state) => (state as Partial<RootState>).academicYearState?.selectedAcademicYearId ?? null
    );
}

//გვერდის ფორმის წლების სიით (lookups): ნაგულისხმევი წელი ფილტრისა და ახალი ჩანაწერისთვის
export function useDefaultAcademicYearId(
    lookups: { currentAcademicYearId: number | null; academicYears: ILookupItem[] } | undefined
): number | null {
    const selectedAcademicYearId = useSelectedAcademicYearId();
    return lookups
        ? pickAcademicYearId(selectedAcademicYearId, lookups.currentAcademicYearId, lookups.academicYears)
        : null;
}
