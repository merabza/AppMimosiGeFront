//crmCallsApi.ts

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
    ICrmCall,
    ICrmCallFormLookups,
    ICrmCallRequest,
    ICrmCallsRowsData,
} from "../types/crmCallsTypes";

const baseUrl = "/crmcalls";

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

//CRM ზარები (Access-ის FrmCRMCalls). სიაც და ბალანსების გვერდის ზარების ისტორიაც rowsdata-ს იყენებს
export const crmCallsApi = createApi({
    reducerPath: "crmCallsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["CrmCalls"],
    endpoints: (builder) => ({
        getCrmCallsRowsData: builder.query<ICrmCallsRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["CrmCalls"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getCrmCallFormLookups: builder.query<ICrmCallFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //სასწავლო წლის კონტრაქტები "გვარი სახელი / ნომერი"-თ, კონტრაქტის ძებნადი არჩევისთვის
        getCrmCallStudentContracts: builder.query<ILookupItem[], number>({
            query: (academicYearId) => ({
                url: `${baseUrl}/studentcontracts?academicYearId=${academicYearId}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getCrmCall: builder.query<ICrmCall, number>({
            query: (crmCallId) => ({ url: `${baseUrl}/${crmCallId}` }),
            //დახურული ზარი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createCrmCall: builder.mutation<number, ICrmCallRequest>({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["CrmCalls"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateCrmCall: builder.mutation<
            void,
            { crmCallId: number; request: ICrmCallRequest }
        >({
            query: ({ crmCallId, request }) => ({
                url: `${baseUrl}/${crmCallId}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["CrmCalls"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteCrmCall: builder.mutation<void, number>({
            query: (crmCallId) => ({
                url: `${baseUrl}/${crmCallId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["CrmCalls"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetCrmCallsRowsDataQuery,
    useLazyGetCrmCallsRowsDataQuery,
    useGetCrmCallFormLookupsQuery,
    useGetCrmCallStudentContractsQuery,
    useGetCrmCallQuery,
    useCreateCrmCallMutation,
    useUpdateCrmCallMutation,
    useDeleteCrmCallMutation,
} = crmCallsApi;
