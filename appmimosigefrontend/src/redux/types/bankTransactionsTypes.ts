//bankTransactionsTypes.ts

//backend-ის AppMimosiGeShared.Contracts-ის შესაბამისი ტიპები (JSON camelCase-ითაა): ბანკის ჩარიცხვები (TBC_INTEGRATION.md)

//matchStep: რომელმა წესმა იპოვა მოსწავლე (0 = ვერ იპოვა); allocatedAmount: გადახდებად განაწილებული ჯამი;
//hasCheckedPayments: განაწილების გადახდა შემოწმებულია და განაწილება აღარ იცვლება (D168)
export interface IBankTransactionRow {
    id: number;
    transactionDate: string;
    amount: number;
    partnerName: string | null;
    purpose: string | null;
    matchStep: number;
    allocatedManually: boolean;
    ignored: boolean;
    allocatedAmount: number;
    hasCheckedPayments: boolean;
}

//studentContractName "გვარი სახელი ნომერი"
export interface IBankTransactionAllocation {
    paymentId: number;
    studentContractId: number;
    studentContractName: string;
    academicYearId: number;
    amount: number;
    checked: boolean;
}

export interface IBankTransaction {
    id: number;
    transactionDate: string;
    amount: number;
    currency: string;
    purpose: string | null;
    additionalInformation: string | null;
    additionalDescription: string | null;
    documentNumber: string | null;
    partnerName: string | null;
    partnerAccountIban: string | null;
    partnerTaxCode: string | null;
    matchStep: number;
    allocatedManually: boolean;
    ignored: boolean;
    allocations: IBankTransactionAllocation[];
}

//ცარიელი: ყველა; unallocated: ბოლომდე გაუნაწილებელი; ignored: არ არის მოსწავლის გადახდა
export type BankTransactionsFilterMode = "" | "unallocated" | "ignored";

//თარიღები yyyy-MM-dd ან ცარიელი (ფილტრის გარეშე)
export interface IBankTransactionsRequest {
    dateFrom: string;
    dateTo: string;
    filter: BankTransactionsFilterMode;
}

export interface IBankTransactionShare {
    studentContractId: number;
    amount: number;
}

export interface IImportBankTransactions {
    periodFrom: string;
    periodTo: string;
    received: number;
    alreadyImported: number;
    imported: number;
    allocated: number;
    unallocated: number;
    dryRun: boolean;
}
