//paymentsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type { IFilterSortRequest } from "../../appcarcass/grid/GridViewTypes";
import { encodeFilterSortRequest } from "../../studentContracts/filterSortRequestEncoding";
import type { ILookupItem } from "../types/studentContractsTypes";
import type {
    IPayment,
    IPaymentFormLookups,
    IPaymentRequest,
    IPaymentsRowsData,
} from "../types/paymentsTypes";

const baseUrl = "/payments";

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

export const paymentsApi = createApi({
    reducerPath: "paymentsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["Payments"],
    endpoints: (builder) => ({
        getPaymentsRowsData: builder.query<IPaymentsRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["Payments"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getPaymentFormLookups: builder.query<IPaymentFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //სასწავლო წლის კონტრაქტები "გვარი სახელი ნომერი"-თ, კონტრაქტის ძებნადი არჩევისთვის
        getPaymentStudentContracts: builder.query<ILookupItem[], number>({
            query: (academicYearId) => ({
                url: `${baseUrl}/studentcontracts?academicYearId=${academicYearId}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getPayment: builder.query<IPayment, number>({
            query: (paymentId) => ({ url: `${baseUrl}/${paymentId}` }),
            //დახურული გადახდა ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createPayment: builder.mutation<number, IPaymentRequest>({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["Payments"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updatePayment: builder.mutation<
            void,
            { paymentId: number; request: IPaymentRequest }
        >({
            query: ({ paymentId, request }) => ({
                url: `${baseUrl}/${paymentId}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["Payments"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deletePayment: builder.mutation<void, number>({
            query: (paymentId) => ({
                url: `${baseUrl}/${paymentId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Payments"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetPaymentsRowsDataQuery,
    useGetPaymentFormLookupsQuery,
    useGetPaymentStudentContractsQuery,
    useGetPaymentQuery,
    useCreatePaymentMutation,
    useUpdatePaymentMutation,
    useDeletePaymentMutation,
} = paymentsApi;
