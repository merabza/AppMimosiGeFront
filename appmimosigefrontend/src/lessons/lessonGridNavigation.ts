//lessonGridNavigation.ts

//დასწრების ბადის კლავიატურით ნავიგაცია: ისრები ზემოთ/ქვემოთ და Enter (Shift+Enter ზემოთ) იმავე სვეტის
//მეზობელ სტრიქონზე გადადის. მარცხნივ/მარჯვნივ ტექსტში კურსორს ამოძრავებს, Tab კი შემდეგ ველზე გადადის (ბრაუზერი)

export interface IGridCell {
    row: number;
    column: number;
}

//data-lesson-cell ატრიბუტის მნიშვნელობა "სტრიქონი-სვეტი"
export function cellKey(cell: IGridCell): string {
    return `${cell.row}-${cell.column}`;
}

export function parseCellKey(value: string | undefined): IGridCell | null {
    const match = /^(\d+)-(\d+)$/.exec(value ?? "");
    if (!match) return null;
    return { row: Number(match[1]), column: Number(match[2]) };
}

//null: კლავიში ნავიგაციისთვის არ არის ან ბადის კიდეზეა
export function targetCell(
    cell: IGridCell,
    key: string,
    shiftKey: boolean,
    rowCount: number
): IGridCell | null {
    let step: number;
    if (key === "ArrowDown") step = 1;
    else if (key === "ArrowUp") step = -1;
    else if (key === "Enter") step = shiftKey ? -1 : 1;
    else return null;
    const row = cell.row + step;
    if (row < 0 || row >= rowCount) return null;
    return { row, column: cell.column };
}
