//academicYearApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type {
    IAcademicYears,
    IAcademicYearWizardInfo,
    ICloseAcademicYearGroups,
    ICloseGroupsRequest,
    INewAcademicYear,
} from "../types/academicYearTypes";

//ჩატვირთვის შეცდომები ApiLoad-ში, ოსტატის ნაბიჯებისა ApiMutation-ში იწერება (AlertMessages აჩვენებს)
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

export function closeGroupsUrl(request: ICloseGroupsRequest): string {
    const params = new URLSearchParams({ closeDate: request.closeDate, dryRun: String(request.dryRun) });
    return `/academicyear/${request.ayId}/closegroups?${params.toString()}`;
}

//სასწავლო წლები (გლობალური ამომრჩევი) და „ახალი სასწავლო წლის" ოსტატი. ნაბიჯის შესრულება (dryRun = false) წლებს
//და ოსტატის ინფორმაციას თავიდან ტვირთავს
export const academicYearApi = createApi({
    reducerPath: "academicYearApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["AcademicYears"],
    endpoints: (builder) => ({
        //ამომრჩევი ყველა გვერდზეა: შეცდომა alert-ად არ ჩნდება, ამომრჩევი უბრალოდ არ ჩანს
        getAcademicYears: builder.query<IAcademicYears, void>({
            query: () => ({ url: "/academicyears" }),
            providesTags: ["AcademicYears"],
        }),
        getAcademicYearWizardInfo: builder.query<IAcademicYearWizardInfo, void>({
            query: () => ({ url: "/academicyear/info" }),
            providesTags: ["AcademicYears"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createAcademicYear: builder.mutation<INewAcademicYear, boolean>({
            query: (dryRun) => ({ url: `/academicyear/create?dryRun=${dryRun}`, method: "POST" }),
            invalidatesTags: (_result, _error, dryRun) => (dryRun ? [] : ["AcademicYears"]),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        closeAcademicYearGroups: builder.mutation<ICloseAcademicYearGroups, ICloseGroupsRequest>({
            query: (request) => ({ url: closeGroupsUrl(request), method: "POST" }),
            invalidatesTags: (_result, _error, request) => (request.dryRun ? [] : ["AcademicYears"]),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetAcademicYearsQuery,
    useGetAcademicYearWizardInfoQuery,
    useCreateAcademicYearMutation,
    useCloseAcademicYearGroupsMutation,
} = academicYearApi;
