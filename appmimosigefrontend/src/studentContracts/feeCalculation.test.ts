//feeCalculation.test.ts

import { describe, expect, it } from "vitest";
import {
    afterFourWeekFeeChange,
    afterHoursOrOneHourFeeChange,
} from "./feeCalculation";

describe("afterFourWeekFeeChange", () => {
    it("recalculates the one hour fee when hours and fee are positive", () => {
        expect(
            afterFourWeekFeeChange({
                fourWeekHours: 8,
                fourWeekFee: 60,
                oneHourFee: 6,
            })
        ).toEqual({ fourWeekHours: 8, fourWeekFee: 60, oneHourFee: 7.5 });
    });

    it("rounds the one hour fee to 4 decimals like Currency/money", () => {
        expect(
            afterFourWeekFeeChange({
                fourWeekHours: 12,
                fourWeekFee: 100,
                oneHourFee: 6,
            }).oneHourFee
        ).toBe(8.3333);
    });

    it.each([
        [0, 48],
        [8, 0],
        [-1, 48],
        [8, -5],
    ])("keeps the one hour fee when hours=%d, fee=%d", (hours, fee) => {
        const fields = { fourWeekHours: hours, fourWeekFee: fee, oneHourFee: 6 };
        expect(afterFourWeekFeeChange(fields)).toBe(fields);
    });
});

describe("afterHoursOrOneHourFeeChange", () => {
    it("recalculates the four week fee from the one hour fee and hours", () => {
        expect(
            afterHoursOrOneHourFeeChange({
                fourWeekHours: 12,
                fourWeekFee: 48,
                oneHourFee: 6,
            })
        ).toEqual({ fourWeekHours: 12, fourWeekFee: 72, oneHourFee: 6 });
    });

    it("recalculates even when hours are zero, like the VBA", () => {
        expect(
            afterHoursOrOneHourFeeChange({
                fourWeekHours: 0,
                fourWeekFee: 48,
                oneHourFee: 6,
            }).fourWeekFee
        ).toBe(0);
    });

    it("rounds the four week fee to 4 decimals", () => {
        expect(
            afterHoursOrOneHourFeeChange({
                fourWeekHours: 1.5,
                fourWeekFee: 0,
                oneHourFee: 8.33333,
            }).fourWeekFee
        ).toBe(12.5);
    });
});
