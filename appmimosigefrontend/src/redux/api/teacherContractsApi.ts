//teacherContractsApi.ts

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
    ITeacherContract,
    ITeacherContractFormLookups,
    ITeacherContractRequest,
    ITeacherContractsRowsData,
} from "../types/teacherContractsTypes";

const baseUrl = "/teachercontracts";

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

export const teacherContractsApi = createApi({
    reducerPath: "teacherContractsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["TeacherContracts", "TeacherContract"],
    endpoints: (builder) => ({
        getTeacherContractsRowsData: builder.query<
            ITeacherContractsRowsData,
            IFilterSortRequest
        >({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["TeacherContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getTeacherContractFormLookups: builder.query<
            ITeacherContractFormLookups,
            void
        >({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //იგივე ძებნა, რაც მოსწავლეების კონტრაქტებში, ოღონდ ამ გვერდის უფლებით
        searchTeacherHumans: builder.query<ILookupItem[], string>({
            query: (search) => ({
                url: `${baseUrl}/humans?search=${encodeURIComponent(search)}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getTeacherContract: builder.query<ITeacherContract, number>({
            query: (id) => ({ url: `${baseUrl}/${id}` }),
            providesTags: (_result, _error, id) => [
                { type: "TeacherContract", id },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createTeacherContract: builder.mutation<
            number,
            ITeacherContractRequest
        >({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["TeacherContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateTeacherContract: builder.mutation<
            void,
            { id: number; request: ITeacherContractRequest }
        >({
            query: ({ id, request }) => ({
                url: `${baseUrl}/${id}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                "TeacherContracts",
                { type: "TeacherContract", id },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteTeacherContract: builder.mutation<void, number>({
            query: (id) => ({
                url: `${baseUrl}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["TeacherContracts"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetTeacherContractsRowsDataQuery,
    useGetTeacherContractFormLookupsQuery,
    useLazySearchTeacherHumansQuery,
    useGetTeacherContractQuery,
    useCreateTeacherContractMutation,
    useUpdateTeacherContractMutation,
    useDeleteTeacherContractMutation,
} = teacherContractsApi;
