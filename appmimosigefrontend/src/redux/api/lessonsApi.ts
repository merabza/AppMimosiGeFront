//lessonsApi.ts

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
    ILesson,
    ILessonFormLookups,
    ILessonRequest,
    ILessonsRowsData,
} from "../types/lessonsTypes";

const baseUrl = "/lessons";

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

//გაკვეთილებს გენერატორი ქმნის და შლის, ამიტომ აქ მხოლოდ ნახვა და ჟურნალის შენახვაა
export const lessonsApi = createApi({
    reducerPath: "lessonsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["Lessons"],
    endpoints: (builder) => ({
        getLessonsRowsData: builder.query<ILessonsRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["Lessons"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getLessonFormLookups: builder.query<ILessonFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getLesson: builder.query<ILesson, number>({
            query: (lessonId) => ({ url: `${baseUrl}/${lessonId}` }),
            //დახურული გაკვეთილი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        updateLesson: builder.mutation<
            void,
            { lessonId: number; request: ILessonRequest }
        >({
            query: ({ lessonId, request }) => ({
                url: `${baseUrl}/${lessonId}`,
                method: "PUT",
                body: request,
            }),
            //გახსნილ გაკვეთილს ფორმა შენახვის შემდეგ თვითონ ტვირთავს თავიდან (refetch)
            invalidatesTags: ["Lessons"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetLessonsRowsDataQuery,
    useGetLessonFormLookupsQuery,
    useGetLessonQuery,
    useUpdateLessonMutation,
} = lessonsApi;
