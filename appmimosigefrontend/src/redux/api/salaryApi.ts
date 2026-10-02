//salaryApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import { fileResponseHandler } from "../../salary/downloadFile";
import { declarationFileName, monthToRequest, transferFileName } from "../../salary/salaryForm";
import type {
    ISalaryCountResult,
    ISalaryFormLookups,
    ISalaryHeader,
    ISalaryHeaderRequest,
    ISalaryHeaderRow,
    ISalaryPartRequest,
} from "../types/salaryTypes";

const baseUrl = "/salary";

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

//ხელფასის უწყისები (Access-ის FrmSalary). უწყისის ყოველი ცვლილების შემდეგ სია და უწყისი თავიდან იტვირთება
export const salaryApi = createApi({
    reducerPath: "salaryApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["SalaryHeaders", "SalaryHeader"],
    endpoints: (builder) => ({
        getSalaryHeaders: builder.query<ISalaryHeaderRow[], void>({
            query: () => ({ url: `${baseUrl}/headers` }),
            providesTags: ["SalaryHeaders"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getSalaryFormLookups: builder.query<ISalaryFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getSalaryHeader: builder.query<ISalaryHeader, number>({
            query: (shId) => ({ url: `${baseUrl}/${shId}` }),
            providesTags: ["SalaryHeader"],
            //დახურული უწყისი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createSalaryHeader: builder.mutation<number, ISalaryHeaderRequest>({
            query: (request) => ({ url: baseUrl, method: "POST", body: request }),
            invalidatesTags: ["SalaryHeaders"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateSalaryHeader: builder.mutation<void, { shId: number; request: ISalaryHeaderRequest }>({
            query: ({ shId, request }) => ({ url: `${baseUrl}/${shId}`, method: "PUT", body: request }),
            invalidatesTags: ["SalaryHeaders", "SalaryHeader"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteSalaryHeader: builder.mutation<void, number>({
            query: (shId) => ({ url: `${baseUrl}/${shId}`, method: "DELETE" }),
            invalidatesTags: ["SalaryHeaders"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        createSalaryPart: builder.mutation<number, { shId: number; request: ISalaryPartRequest }>({
            query: ({ shId, request }) => ({ url: `${baseUrl}/${shId}/parts`, method: "POST", body: request }),
            invalidatesTags: ["SalaryHeader"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateSalaryPart: builder.mutation<void, { spId: number; request: ISalaryPartRequest }>({
            query: ({ spId, request }) => ({ url: `${baseUrl}/parts/${spId}`, method: "PUT", body: request }),
            invalidatesTags: ["SalaryHeader"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteSalaryPart: builder.mutation<void, number>({
            query: (spId) => ({ url: `${baseUrl}/parts/${spId}`, method: "DELETE" }),
            invalidatesTags: ["SalaryHeader"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        //ძველი სტრიქონები და ტიპი 1-ის მდგენელები იშლება და თავიდან ითვლება
        countSalary: builder.mutation<ISalaryCountResult, number>({
            query: (shId) => ({ url: `${baseUrl}/${shId}/count`, method: "POST" }),
            invalidatesTags: ["SalaryHeaders", "SalaryHeader"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        //ფაილი ბრაუზერში ჩამოიტვირთება; პასუხი ფაილის სახელია
        downloadTransferFile: builder.mutation<string, { shId: number; transferDate: string }>({
            query: ({ shId, transferDate }) => ({
                url: `${baseUrl}/${shId}/transferfile`,
                responseHandler: fileResponseHandler(transferFileName(transferDate)),
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        //month: "YYYY-MM"
        downloadDeclarationFile: builder.mutation<string, string>({
            query: (month) => ({
                url: `${baseUrl}/declarationfile?month=${monthToRequest(month)}`,
                responseHandler: fileResponseHandler(declarationFileName(month)),
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetSalaryHeadersQuery,
    useGetSalaryFormLookupsQuery,
    useGetSalaryHeaderQuery,
    useCreateSalaryHeaderMutation,
    useUpdateSalaryHeaderMutation,
    useDeleteSalaryHeaderMutation,
    useCreateSalaryPartMutation,
    useUpdateSalaryPartMutation,
    useDeleteSalaryPartMutation,
    useCountSalaryMutation,
    useDownloadTransferFileMutation,
    useDownloadDeclarationFileMutation,
} = salaryApi;
