//bankTransactionsLogic.test.ts

import { describe, expect, it } from "vitest";
import {
    filterFromSearchParams,
    filterToSearchParams,
    importSummary,
    matchStepCaption,
    rowStatus,
    sharesError,
    sharesFromAllocations,
    sharesTotal,
    toShares,
    type IShareRow,
} from "./bankTransactionsLogic";
import { bankTransactionData, bankTransactionRow } from "../testUtils/bankTransactionsTestStore";

const share = (studentContractId: string, amount: string, key = 0): IShareRow => ({
    key,
    academicYearId: "11",
    studentContractId,
    amount,
});

describe("matchStepCaption", () => {
    it("names every step of the backend", () => {
        expect([0, 1, 2, 3, 4, 5, 6, 7].map(matchStepCaption)).toEqual([
            "ვერ მოიძებნა",
            "კონტრაქტის ნომერი",
            "მოსწავლის სახელი",
            "მოსწავლის გვარი",
            "გადამხდელის პირადი ნომერი",
            "გადამხდელის ანგარიში",
            "გადამხდელის სახელი",
            "გადამხდელის გვარი",
        ]);
        expect(matchStepCaption(9)).toBe("9");
    });
});

describe("rowStatus", () => {
    it("tells the allocation state", () => {
        expect(rowStatus(bankTransactionRow({ ignored: true, allocatedAmount: 0 }))).toBe("არ არის მოსწავლის");
        expect(rowStatus(bankTransactionRow({ allocatedAmount: 0 }))).toBe("გაუნაწილებელი");
        expect(rowStatus(bankTransactionRow({ allocatedAmount: 99.99 }))).toBe("ნაწილობრივ");
        expect(rowStatus(bankTransactionRow())).toBe("განაწილებული");
        expect(rowStatus(bankTransactionRow({ allocatedManually: true }))).toBe("განაწილებული ხელით");
    });
});

describe("filter search params", () => {
    it("reads the dates and the mode, an unknown mode is none", () => {
        expect(
            filterFromSearchParams(new URLSearchParams("dateFrom=2026-11-01&dateTo=2026-11-09&filter=ignored"))
        ).toEqual({ dateFrom: "2026-11-01", dateTo: "2026-11-09", filter: "ignored" });
        expect(filterFromSearchParams(new URLSearchParams("filter=all"))).toEqual({
            dateFrom: "",
            dateTo: "",
            filter: "",
        });
    });

    it("writes only what is set", () => {
        expect(filterToSearchParams({ dateFrom: "", dateTo: "2026-11-09", filter: "unallocated" }).toString()).toBe(
            "dateTo=2026-11-09&filter=unallocated"
        );
        expect(filterToSearchParams({ dateFrom: "2026-11-01", dateTo: "", filter: "" }).toString()).toBe(
            "dateFrom=2026-11-01"
        );
    });
});

describe("importSummary", () => {
    it("tells the period and the counts", () => {
        expect(
            importSummary({
                periodFrom: "2026-11-06T00:00:00",
                periodTo: "2026-11-09T00:00:00",
                received: 5,
                alreadyImported: 2,
                imported: 3,
                allocated: 2,
                unallocated: 1,
                dryRun: false,
            })
        ).toBe(
            "ბანკიდან მიღებულია 5 ჩარიცხვა (2026-11-06 – 2026-11-09), აქედან ახალი 3: განაწილდა 2, გაუნაწილებელია 1"
        );
    });
});

describe("shares", () => {
    it("start from the allocation", () => {
        expect(sharesFromAllocations(bankTransactionData().allocations)).toEqual([
            { key: 0, academicYearId: "11", studentContractId: "10", contractName: "Alpha Ann 6.001", amount: "60" },
        ]);
    });

    it("sum to the cent, ignoring what is not a number", () => {
        expect(sharesTotal([share("10", "0.1"), share("11", "0.2"), share("12", "x"), share("13", "")])).toBe(0.3);
    });

    it("become the request", () => {
        expect(toShares([share("10", "60.5"), share("11", "39.5")])).toEqual([
            { studentContractId: 10, amount: 60.5 },
            { studentContractId: 11, amount: 39.5 },
        ]);
    });

    it.each([
        [[share("", "5")], "ყველა სტრიქონში აირჩიეთ მოსწავლის კონტრაქტი"],
        [[share("10", "5"), share("10", "6", 1)], "ერთი კონტრაქტი განაწილებაში ორჯერ ვერ იქნება"],
        [[share("10", "")], "წილის თანხა 0-ზე მეტი უნდა იყოს"],
        [[share("10", "0")], "წილის თანხა 0-ზე მეტი უნდა იყოს"],
        [[share("10", "-1")], "წილის თანხა 0-ზე მეტი უნდა იყოს"],
        [[share("10", "abc")], "წილის თანხა 0-ზე მეტი უნდა იყოს"],
        [[share("10", "1.005")], "წილის თანხას 2-ზე მეტი ათწილადი ვერ ექნება"],
        [[share("10", "60"), share("11", "40.01", 1)], "განაწილებული ჯამი ჩარიცხულ თანხაზე მეტი ვერ იქნება"],
    ])("reports %j", (rows, message) => {
        expect(sharesError(rows, 100)).toBe(message);
    });

    it("accept the whole amount, less, or nothing", () => {
        expect(sharesError([share("10", "60.1"), share("11", "39.9", 1)], 100)).toBeNull();
        expect(sharesError([share("10", "0.01")], 100)).toBeNull();
        expect(sharesError([], 100)).toBeNull();
    });
});
