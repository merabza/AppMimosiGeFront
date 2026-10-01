//chargesAndPaymentsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import { setAlertApiLoadError } from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type { IFilterSortRequest } from "../../appcarcass/grid/GridViewTypes";
import { encodeFilterSortRequest } from "../../studentContracts/filterSortRequestEncoding";
import type { ILookupItem } from "../types/studentContractsTypes";
import type {
    IBalancesFormLookups,
    IStatementRowsData,
} from "../types/balancesTypes";

const baseUrl = "/chargesandpayments";

//ჩატვირთვის შეცდომები ApiLoad-ში იწერება (AlertMessages აჩვენებს)
async function reportLoadError(
    dispatch: (action: unknown) => unknown,
    queryFulfilled: Promise<unknown>
) {
    try {
        await queryFulfilled;
    } catch (error) {
        dispatch(setAlertApiLoadError(buildErrorMessage(error)));
    }
}

//ამონაწერი (Access-ის FrmChargesAndPayments): მხოლოდ კითხვა, დარიცხვა ყოველთვის გაკვეთილებიდან ითვლება
export const chargesAndPaymentsApi = createApi({
    reducerPath: "chargesAndPaymentsApi",
    baseQuery: jwtBaseQuery,
    endpoints: (builder) => ({
        getStatementRowsData: builder.query<IStatementRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            //დარიცხვები და გადახდები სხვა გვერდებზე იცვლება, ამიტომ ამონაწერი ქეშში არ რჩება
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getStatementFormLookups: builder.query<IBalancesFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //სასწავლო წლის კონტრაქტები "გვარი სახელი ნომერი"-თ, ფილტრის "მოსწავლე"-სთვის
        getStatementStudentContracts: builder.query<ILookupItem[], number>({
            query: (academicYearId) => ({
                url: `${baseUrl}/studentcontracts?academicYearId=${academicYearId}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetStatementRowsDataQuery,
    useGetStatementFormLookupsQuery,
    useGetStatementStudentContractsQuery,
} = chargesAndPaymentsApi;
