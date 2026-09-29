//feeCalculation.ts

//კონტრაქტის ტარიფის ველების ავტომატური გადათვლა (Access-ის "StudentContractDetails subform"-ის VBA-ს მიხედვით)

export interface IFeeFields {
    fourWeekHours: number;
    fourWeekFee: number;
    oneHourFee: number;
}

//Access-ის Currency და SQL-ის money 4 ათწილად ნიშნამდე ინახავს
function roundMoney(value: number): number {
    return Math.round(value * 10000) / 10000;
}

//FourWeekFee_AfterUpdate: ერთი საათის ღირებულება ითვლება მხოლოდ მაშინ, როცა საათებიც და გადასახადიც დადებითია
export function afterFourWeekFeeChange(fields: IFeeFields): IFeeFields {
    if (fields.fourWeekHours > 0 && fields.fourWeekFee > 0) {
        return {
            ...fields,
            oneHourFee: roundMoney(fields.fourWeekFee / fields.fourWeekHours),
        };
    }
    return fields;
}

//FourWeekHours_AfterUpdate და OneHourFee_AfterUpdate: 4 კვირის გადასახადი = საათის ღირებულება × საათები
export function afterHoursOrOneHourFeeChange(fields: IFeeFields): IFeeFields {
    return {
        ...fields,
        fourWeekFee: roundMoney(fields.oneHourFee * fields.fourWeekHours),
    };
}
