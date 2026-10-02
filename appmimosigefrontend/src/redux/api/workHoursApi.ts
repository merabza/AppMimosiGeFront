//workHoursApi.ts

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
    IWorkHour,
    IWorkHourFormLookups,
    IWorkHourRequest,
    IWorkHoursAutoGenerateRequest,
    IWorkHoursAutoGenerateResult,
    IWorkHoursRowsData,
    IWorkTimeFixRequest,
} from "../types/workHoursTypes";

const baseUrl = "/workhours";

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

//თანამშრომლების ნამუშევარი დრო (Access-ის FrmWorkHours). ყოველი ცვლილების შემდეგ სია თავიდან იტვირთება
export const workHoursApi = createApi({
    reducerPath: "workHoursApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["WorkHours"],
    endpoints: (builder) => ({
        getWorkHoursRowsData: builder.query<IWorkHoursRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getWorkHourFormLookups: builder.query<IWorkHourFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getWorkHour: builder.query<IWorkHour, number>({
            query: (whId) => ({ url: `${baseUrl}/${whId}` }),
            //დახურული ჩანაწერი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createWorkHour: builder.mutation<number, IWorkHourRequest>({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateWorkHour: builder.mutation<
            void,
            { whId: number; request: IWorkHourRequest }
        >({
            query: ({ whId, request }) => ({
                url: `${baseUrl}/${whId}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteWorkHour: builder.mutation<void, number>({
            query: (whId) => ({
                url: `${baseUrl}/${whId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        //სერვერის დროით: დაწყება = ახლა - ლუფტი, დასრულება = ახლა + ლუფტი; პასუხი დაფიქსირებული ჩანაწერია
        startWork: builder.mutation<IWorkHour, IWorkTimeFixRequest>({
            query: (request) => ({
                url: `${baseUrl}/start`,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        endWork: builder.mutation<IWorkHour, IWorkTimeFixRequest>({
            query: (request) => ({
                url: `${baseUrl}/end`,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        autoGenerateWorkHours: builder.mutation<
            IWorkHoursAutoGenerateResult,
            IWorkHoursAutoGenerateRequest
        >({
            query: (request) => ({
                url: `${baseUrl}/autogenerate`,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["WorkHours"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetWorkHoursRowsDataQuery,
    useGetWorkHourFormLookupsQuery,
    useGetWorkHourQuery,
    useCreateWorkHourMutation,
    useUpdateWorkHourMutation,
    useDeleteWorkHourMutation,
    useStartWorkMutation,
    useEndWorkMutation,
    useAutoGenerateWorkHoursMutation,
} = workHoursApi;
