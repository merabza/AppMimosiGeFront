//bankTransactionsLogic.ts

import type {
    BankTransactionsFilterMode,
    IBankTransactionAllocation,
    IBankTransactionRow,
    IBankTransactionShare,
    IBankTransactionsRequest,
    IImportBankTransactions,
} from "../redux/types/bankTransactionsTypes";

//backend-ის EPaymentMatchStep: რომელმა წესმა იპოვა მოსწავლე (TBC_INTEGRATION.md §4)
const matchStepCaptions: Record<number, string> = {
    0: "ვერ მოიძებნა",
    1: "კონტრაქტის ნომერი",
    2: "მოსწავლის სახელი",
    3: "მოსწავლის გვარი",
    4: "გადამხდელის პირადი ნომერი",
    5: "გადამხდელის ანგარიში",
    6: "გადამხდელის სახელი",
    7: "გადამხდელის გვარი",
};

export function matchStepCaption(matchStep: number): string {
    return matchStepCaptions[matchStep] ?? String(matchStep);
}

//სტრიქონის მდგომარეობა სიაში
export function rowStatus(row: IBankTransactionRow): string {
    if (row.ignored) return "არ არის მოსწავლის";
    if (row.allocatedAmount === 0) return "გაუნაწილებელი";
    if (row.allocatedAmount < row.amount) return "ნაწილობრივ";
    return row.allocatedManually ? "განაწილებული ხელით" : "განაწილებული";
}

const filterModes: BankTransactionsFilterMode[] = ["", "unallocated", "ignored"];

//სიის ფილტრი URL-ში: თარიღები yyyy-MM-dd (ცარიელი = ფილტრის გარეშე) და მდგომარეობა
export function filterFromSearchParams(params: URLSearchParams): IBankTransactionsRequest {
    const filter = params.get("filter") ?? "";
    return {
        dateFrom: params.get("dateFrom") ?? "",
        dateTo: params.get("dateTo") ?? "",
        filter: filterModes.includes(filter as BankTransactionsFilterMode)
            ? (filter as BankTransactionsFilterMode)
            : "",
    };
}

export function filterToSearchParams(filter: IBankTransactionsRequest): URLSearchParams {
    const params = new URLSearchParams();
    if (filter.dateFrom !== "") params.set("dateFrom", filter.dateFrom);
    if (filter.dateTo !== "") params.set("dateTo", filter.dateTo);
    if (filter.filter !== "") params.set("filter", filter.filter);
    return params;
}

export function importSummary(result: IImportBankTransactions): string {
    return (
        `ბანკიდან მიღებულია ${result.received} ჩარიცხვა (${result.periodFrom.slice(0, 10)} – ` +
        `${result.periodTo.slice(0, 10)}), აქედან ახალი ${result.imported}: განაწილდა ${result.allocated}, ` +
        `გაუნაწილებელია ${result.unallocated}`
    );
}

//განაწილების რედაქტორის ერთი სტრიქონი: წელი და კონტრაქტი არჩევისთვის (სტრიქონებად), თანხა როგორც შეიყვანეს
export interface IShareRow {
    key: number;
    academicYearId: string;
    studentContractId: string;
    contractName?: string;
    amount: string;
}

export function sharesFromAllocations(allocations: IBankTransactionAllocation[]): IShareRow[] {
    return allocations.map((allocation, index) => ({
        key: index,
        academicYearId: String(allocation.academicYearId),
        studentContractId: String(allocation.studentContractId),
        contractName: allocation.studentContractName,
        amount: String(allocation.amount),
    }));
}

//თეთრებში, რომ ათწილადების ჯამი ზუსტი იყოს
function cents(amount: string): number {
    return Math.round(Number(amount) * 100);
}

//შეყვანილი წილების ჯამი (არარიცხვითი თანხა 0-ად ითვლება)
export function sharesTotal(rows: IShareRow[]): number {
    return rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.amount)) ? cents(row.amount) : 0), 0) / 100;
}

//შენახვამდე შემოწმება (სერვერიც ამოწმებს); null: შეცდომა არ არის
export function sharesError(rows: IShareRow[], transactionAmount: number): string | null {
    if (rows.some((row) => row.studentContractId === "")) return "ყველა სტრიქონში აირჩიეთ მოსწავლის კონტრაქტი";
    if (new Set(rows.map((row) => row.studentContractId)).size !== rows.length)
        return "ერთი კონტრაქტი განაწილებაში ორჯერ ვერ იქნება";
    for (const row of rows) {
        const amount = Number(row.amount);
        if (row.amount.trim() === "" || !Number.isFinite(amount) || amount <= 0)
            return "წილის თანხა 0-ზე მეტი უნდა იყოს";
        if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6)
            return "წილის თანხას 2-ზე მეტი ათწილადი ვერ ექნება";
    }
    if (Math.round(sharesTotal(rows) * 100) > Math.round(transactionAmount * 100))
        return "განაწილებული ჯამი ჩარიცხულ თანხაზე მეტი ვერ იქნება";
    return null;
}

export function toShares(rows: IShareRow[]): IBankTransactionShare[] {
    return rows.map((row) => ({ studentContractId: Number(row.studentContractId), amount: Number(row.amount) }));
}
