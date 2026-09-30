//groupOverlaps.ts

import type { IDayTimePlaceFormRow, ITeacherFormRow } from "./groupForm";

//პერიოდები [დაწყება, დასრულება): დასრულების დღე პერიოდში აღარ შედის, ცარიელი დასრულება დაუსრულებელს ნიშნავს.
//თარიღები "YYYY-MM-DD"-ია, ამიტომ სტრიქონებად შედარდება. სერვერი იგივე წესით ამოწმებს (GroupPeriods)
const openEnd = "9999-12-31";

export function periodsOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean {
    if (start1 === "" || start2 === "") return false;
    return start1 < (end2 || openEnd) && start2 < (end1 || openEnd);
}

interface IPeriodRow {
    key: number;
    startDate: string;
    endDate: string;
}

function overlappingKeys<T extends IPeriodRow>(
    rows: T[],
    sameSlot: (a: T, b: T) => boolean
): Set<number> {
    const keys = new Set<number>();
    rows.forEach((a, index) =>
        rows.slice(index + 1).forEach((b) => {
            if (
                sameSlot(a, b) &&
                periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate)
            ) {
                keys.add(a.key);
                keys.add(b.key);
            }
        })
    );
    return keys;
}

//გაკვეთილების გენერატორის შეცდომა 5: ერთ დღეს ორი მასწავლებელი
export function overlappingTeacherKeys(rows: ITeacherFormRow[]): Set<number> {
    return overlappingKeys(rows, () => true);
}

//გაკვეთილების გენერატორის შეცდომა 7: ერთ კვირის დღეზე ორი განრიგი
export function overlappingDayTimePlaceKeys(
    rows: IDayTimePlaceFormRow[]
): Set<number> {
    return overlappingKeys(
        rows,
        (a, b) => a.weekDayId !== "" && a.weekDayId === b.weekDayId
    );
}
