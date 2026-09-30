//studentContractsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type { IFilterSortRequest } from "../../appcarcass/grid/GridViewTypes";
import { encodeFilterSortRequest } from "../../studentContracts/filterSortRequestEncoding";
import type {
    ILookupItem,
    IStudentContract,
    IStudentContractFormLookups,
    IStudentContractRequest,
    IStudentContractsRowsData,
} from "../types/studentContractsTypes";

const baseUrl = "/studentcontracts";

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

export const studentContractsApi = createApi({
    reducerPath: "studentContractsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["StudentContracts", "StudentContract"],
    endpoints: (builder) => ({
        getStudentContractsRowsData: builder.query<
            IStudentContractsRowsData,
            IFilterSortRequest
        >({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["StudentContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getStudentContractFormLookups: builder.query<
            IStudentContractFormLookups,
            void
        >({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        searchHumans: builder.query<ILookupItem[], string>({
            query: (search) => ({
                url: `${baseUrl}/humans?search=${encodeURIComponent(search)}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getStudentContract: builder.query<IStudentContract, number>({
            query: (scId) => ({ url: `${baseUrl}/${scId}` }),
            //დახურული კონტრაქტი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            providesTags: (_result, _error, scId) => [
                { type: "StudentContract", id: scId },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createStudentContract: builder.mutation<
            number,
            IStudentContractRequest
        >({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["StudentContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateStudentContract: builder.mutation<
            void,
            { scId: number; request: IStudentContractRequest }
        >({
            query: ({ scId, request }) => ({
                url: `${baseUrl}/${scId}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: (_result, _error, { scId }) => [
                "StudentContracts",
                { type: "StudentContract", id: scId },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteStudentContract: builder.mutation<void, number>({
            query: (scId) => ({
                url: `${baseUrl}/${scId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["StudentContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetStudentContractsRowsDataQuery,
    useGetStudentContractFormLookupsQuery,
    useLazySearchHumansQuery,
    useGetStudentContractQuery,
    useCreateStudentContractMutation,
    useUpdateStudentContractMutation,
    useDeleteStudentContractMutation,
} = studentContractsApi;
