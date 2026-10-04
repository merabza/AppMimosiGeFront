//reportsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import { fileResponseHandler } from "../../salary/downloadFile";
import type { IReport, IReportCatalog, IReportLookups } from "../types/reportsTypes";

const baseUrl = "/reports";

//კატალოგისა და სიების ჩატვირთვის შეცდომა ApiLoad-ში, რეპორტისა და ფაილის შეცდომა ApiMutation-ში იწერება
//(გვერდზე ფილტრების ქვეშ ჩანს, გვერდი კი რჩება)
async function reportLoadError(dispatch: (action: unknown) => unknown, queryFulfilled: Promise<unknown>) {
    try {
        await queryFulfilled;
    } catch (error) {
        dispatch(setAlertApiLoadError(buildErrorMessage(error)));
    }
}

async function reportRunError(dispatch: (action: unknown) => unknown, queryFulfilled: Promise<unknown>) {
    try {
        await queryFulfilled;
    } catch (error) {
        dispatch(setAlertApiMutationError(buildErrorMessage(error)));
    }
}

//query: რეპორტის პარამეტრები ბმულის ფორმით ("endDate=2026-10-02")
export interface IReportRequest {
    key: string;
    query: string;
}

//რეპორტები (Access-ის FrmMain): კატალოგი მომხმარებლის უფლებებით, ფილტრების სიები, რეპორტი და მისი Excel-ის ფაილი
export const reportsApi = createApi({
    reducerPath: "reportsApi",
    baseQuery: jwtBaseQuery,
    endpoints: (builder) => ({
        getReportCatalog: builder.query<IReportCatalog, void>({
            query: () => ({ url: `${baseUrl}/catalog` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) => reportLoadError(dispatch, queryFulfilled),
        }),
        getReportLookups: builder.query<IReportLookups, void>({
            query: () => ({ url: `${baseUrl}/lookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) => reportLoadError(dispatch, queryFulfilled),
        }),
        //რეპორტი "ნახვა"-ზე იტვირთება და ქეშში არ რჩება: იგივე ფილტრით ხელახლა ნახვა მონაცემებს თავიდან კითხულობს
        getReport: builder.query<IReport, IReportRequest>({
            query: ({ key, query }) => ({
                url: `${baseUrl}/${encodeURIComponent(key)}${query === "" ? "" : `?${query}`}`,
            }),
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) => reportRunError(dispatch, queryFulfilled),
        }),
        //ფაილი ბრაუზერში ჩამოიტვირთება; პასუხი ფაილის სახელია
        downloadReportExcel: builder.mutation<string, IReportRequest & { fileName: string }>({
            query: ({ key, query, fileName }) => ({
                url: `${baseUrl}/${encodeURIComponent(key)}/excel${query === "" ? "" : `?${query}`}`,
                responseHandler: fileResponseHandler(fileName),
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) => reportRunError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetReportCatalogQuery,
    useGetReportLookupsQuery,
    useLazyGetReportQuery,
    useDownloadReportExcelMutation,
} = reportsApi;
