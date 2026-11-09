//bankTransactionsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type { ILookupItem } from "../types/studentContractsTypes";
import type {
    IBankTransaction,
    IBankTransactionRow,
    IBankTransactionShare,
    IBankTransactionsRequest,
    IImportBankTransactions,
} from "../types/bankTransactionsTypes";

const baseUrl = "/banktransactions";

//ჩატვირთვის შეცდომები ApiLoad-ში, ცვლილების შეცდომები ApiMutation-ში იწერება (AlertMessages აჩვენებს)
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

async function reportMutationError(
    dispatch: (action: unknown) => unknown,
    queryFulfilled: Promise<unknown>
) {
    try {
        await queryFulfilled;
    } catch (error) {
        dispatch(setAlertApiMutationError(buildErrorMessage(error)));
    }
}

//ცარიელი პარამეტრი არ იგზავნება (ფილტრის გარეშე)
export function bankTransactionsQueryString(request: IBankTransactionsRequest): string {
    const params = new URLSearchParams();
    if (request.dateFrom !== "") params.set("dateFrom", request.dateFrom);
    if (request.dateTo !== "") params.set("dateTo", request.dateTo);
    if (request.filter !== "") params.set("filter", request.filter);
    return params.toString();
}

export const bankTransactionsApi = createApi({
    reducerPath: "bankTransactionsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["BankTransactions"],
    endpoints: (builder) => ({
        getBankTransactions: builder.query<IBankTransactionRow[], IBankTransactionsRequest>({
            query: (request) => {
                const queryString = bankTransactionsQueryString(request);
                return { url: queryString === "" ? baseUrl : `${baseUrl}?${queryString}` };
            },
            providesTags: ["BankTransactions"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getBankTransaction: builder.query<IBankTransaction, number>({
            query: (bankTransactionId) => ({ url: `${baseUrl}/${bankTransactionId}` }),
            providesTags: ["BankTransactions"],
            //ხელახლა გახსნისას რედაქტორი ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //სასწავლო წლის კონტრაქტები "გვარი სახელი ნომერი"-თ, განაწილების ძებნადი არჩევისთვის
        getBankTransactionStudentContracts: builder.query<ILookupItem[], number>({
            query: (academicYearId) => ({
                url: `${baseUrl}/studentcontracts?academicYearId=${academicYearId}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //ბანკიდან ახალი ჩარიცხვები: პერიოდი სერვერზე ირჩევა (ბოლო ჩარიცხვის წინა დღეებიდან დღემდე)
        importBankTransactions: builder.mutation<IImportBankTransactions, void>({
            query: () => ({ url: `${baseUrl}/import`, method: "POST" }),
            invalidatesTags: ["BankTransactions"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        setBankTransactionAllocation: builder.mutation<
            void,
            { bankTransactionId: number; shares: IBankTransactionShare[] }
        >({
            query: ({ bankTransactionId, shares }) => ({
                url: `${baseUrl}/${bankTransactionId}/allocation`,
                method: "PUT",
                body: { shares },
            }),
            invalidatesTags: ["BankTransactions"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        setBankTransactionIgnored: builder.mutation<
            void,
            { bankTransactionId: number; ignored: boolean }
        >({
            query: ({ bankTransactionId, ignored }) => ({
                url: `${baseUrl}/${bankTransactionId}/ignored`,
                method: "PUT",
                body: { ignored },
            }),
            invalidatesTags: ["BankTransactions"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetBankTransactionsQuery,
    useGetBankTransactionQuery,
    useGetBankTransactionStudentContractsQuery,
    useImportBankTransactionsMutation,
    useSetBankTransactionAllocationMutation,
    useSetBankTransactionIgnoredMutation,
} = bankTransactionsApi;
