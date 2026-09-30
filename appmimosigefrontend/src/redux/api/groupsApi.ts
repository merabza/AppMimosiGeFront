//groupsApi.ts

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
    IGroup,
    IGroupFormLookups,
    IGroupRequest,
    IGroupStudentContractLookup,
    IGroupsRowsData,
} from "../types/groupsTypes";

const baseUrl = "/groups";

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

export const groupsApi = createApi({
    reducerPath: "groupsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["Groups", "Group"],
    endpoints: (builder) => ({
        getGroupsRowsData: builder.query<IGroupsRowsData, IFilterSortRequest>({
            query: (filterSortRequest) => ({
                url: `${baseUrl}/rowsdata?filterSortRequest=${encodeFilterSortRequest(
                    filterSortRequest
                )}`,
            }),
            providesTags: ["Groups"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getGroupFormLookups: builder.query<IGroupFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //ჯგუფის სასწავლო წლის მოსწავლეების კონტრაქტები ტარიფებით
        getGroupStudentContracts: builder.query<
            IGroupStudentContractLookup[],
            number
        >({
            query: (academicYearId) => ({
                url: `${baseUrl}/studentcontracts?academicYearId=${academicYearId}`,
            }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getGroup: builder.query<IGroup, number>({
            query: (grpId) => ({ url: `${baseUrl}/${grpId}` }),
            //დახურული ჯგუფი ქეშში არ რჩება: ხელახლა გახსნისას ფორმა ქეშის ძველი მონაცემით არ უნდა შეივსოს
            keepUnusedDataFor: 0,
            providesTags: (_result, _error, grpId) => [
                { type: "Group", id: grpId },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        createGroup: builder.mutation<number, IGroupRequest>({
            query: (request) => ({
                url: baseUrl,
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["Groups"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        updateGroup: builder.mutation<
            void,
            { grpId: number; request: IGroupRequest }
        >({
            query: ({ grpId, request }) => ({
                url: `${baseUrl}/${grpId}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: (_result, _error, { grpId }) => [
                "Groups",
                { type: "Group", id: grpId },
            ],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        deleteGroup: builder.mutation<void, number>({
            query: (grpId) => ({
                url: `${baseUrl}/${grpId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Groups"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useLazyGetGroupsRowsDataQuery,
    useGetGroupFormLookupsQuery,
    useGetGroupStudentContractsQuery,
    useGetGroupQuery,
    useCreateGroupMutation,
    useUpdateGroupMutation,
    useDeleteGroupMutation,
} = groupsApi;
