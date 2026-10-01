//depositsApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import type {
    IBalancesFormLookups,
    IBalancesRecount,
    IDeposits,
    IDepositsRequest,
} from "../types/balancesTypes";

const baseUrl = "/deposits";

//ჩატვირთვის შეცდომები ApiLoad-ში, გადაანგარიშებისა ApiMutation-ში იწერება (AlertMessages აჩვენებს)
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

//ცარიელი პარამეტრი არ იგზავნება: წელი = ყველა, ფილტრი = ფილტრის გარეშე
export function depositsQueryString(request: IDepositsRequest): string {
    const params = new URLSearchParams();
    if (request.academicYearId !== "") params.set("academicYearId", request.academicYearId);
    params.set("maximum", request.maximum === "" ? "0" : request.maximum);
    params.set("dateTo", request.dateTo);
    if (request.filter !== "") params.set("filter", request.filter);
    return params.toString();
}

//ბალანსები (Access-ის FrmDeposites). გადაანგარიშება შემდეგი გადახდის თარიღებს ცვლის, ამიტომ სია თავიდან იტვირთება
export const depositsApi = createApi({
    reducerPath: "depositsApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["Deposits"],
    endpoints: (builder) => ({
        getDeposits: builder.query<IDeposits, IDepositsRequest>({
            query: (request) => ({ url: `${baseUrl}/rows?${depositsQueryString(request)}` }),
            providesTags: ["Deposits"],
            keepUnusedDataFor: 0,
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        getDepositsFormLookups: builder.query<IBalancesFormLookups, void>({
            query: () => ({ url: `${baseUrl}/formlookups` }),
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportLoadError(dispatch, queryFulfilled),
        }),
        //გახსნისას: dirty ჯგუფების გაკვეთილები და dirty კონტრაქტების შემდეგი გადახდის თარიღი
        recountBalances: builder.mutation<IBalancesRecount, void>({
            query: () => ({ url: `${baseUrl}/recount`, method: "POST" }),
            invalidatesTags: ["Deposits"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
        //"სრული გადაანგარიშება": ყველა ჯგუფი და ყველა კონტრაქტი (სპეციალური უფლებით)
        fullRecountBalances: builder.mutation<IBalancesRecount, void>({
            query: () => ({ url: `${baseUrl}/fullrecount`, method: "POST" }),
            invalidatesTags: ["Deposits"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                reportMutationError(dispatch, queryFulfilled),
        }),
    }),
});

export const {
    useGetDepositsQuery,
    useGetDepositsFormLookupsQuery,
    useRecountBalancesMutation,
    useFullRecountBalancesMutation,
} = depositsApi;
