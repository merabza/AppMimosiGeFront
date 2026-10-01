//lessonGeneratorApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { jwtBaseQuery } from "../../appcarcass/redux/api/jwtBaseQuery";
import {
    setAlertApiLoadError,
    setAlertApiMutationError,
} from "../../appcarcass/redux/slices/alertSlice";
import { buildErrorMessage } from "../../appcarcass/redux/types/errorTypes";
import { groupsApi } from "./groupsApi";
import type {
    IGroupLastLesson,
    ILessonGeneratorLogRow,
    ILessonsGeneration,
} from "../types/lessonGeneratorTypes";

const baseUrl = "/lessongenerator";

//გენერაცია ჯგუფების DirtyLessons-ს ცვლის, ამიტომ ჯგუფების სია და გახსნილი ჯგუფი თავიდან იტვირთება.
//შეცდომა ApiMutation-ში იწერება (AlertMessages აჩვენებს)
async function afterGeneration(
    dispatch: (action: unknown) => unknown,
    queryFulfilled: Promise<unknown>
) {
    try {
        await queryFulfilled;
        dispatch(groupsApi.util.invalidateTags(["Groups", "Group"]));
    } catch (error) {
        dispatch(setAlertApiMutationError(buildErrorMessage(error)));
    }
}

export const lessonGeneratorApi = createApi({
    reducerPath: "lessonGeneratorApi",
    baseQuery: jwtBaseQuery,
    tagTypes: ["LessonGeneratorLog"],
    endpoints: (builder) => ({
        //Access-ის "ამ ჯგუფის გაკვეთილები"
        generateGroupLessons: builder.mutation<ILessonsGeneration, number>({
            query: (grpId) => ({
                url: `${baseUrl}/groups/${grpId}`,
                method: "POST",
            }),
            invalidatesTags: ["LessonGeneratorLog"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                afterGeneration(dispatch, queryFulfilled),
        }),
        //Access-ის "ამ ჯგუფის ბოლო გაკვეთილი"
        generateGroupLastLesson: builder.mutation<IGroupLastLesson, number>({
            query: (grpId) => ({
                url: `${baseUrl}/groups/${grpId}/lastlesson`,
                method: "POST",
            }),
            invalidatesTags: ["LessonGeneratorLog"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                afterGeneration(dispatch, queryFulfilled),
        }),
        //Access-ის "ყველა ჯგუფის გაკვეთილები": მხოლოდ DirtyLessons-იანი ჯგუფები
        generateDirtyGroupsLessons: builder.mutation<ILessonsGeneration, void>({
            query: () => ({ url: `${baseUrl}/dirtygroups`, method: "POST" }),
            invalidatesTags: ["LessonGeneratorLog"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                afterGeneration(dispatch, queryFulfilled),
        }),
        //Access-ის "გადაანგარიშება": ყველა ჯგუფი (სპეციალური უფლებით)
        generateAllGroupsLessons: builder.mutation<ILessonsGeneration, void>({
            query: () => ({ url: `${baseUrl}/allgroups`, method: "POST" }),
            invalidatesTags: ["LessonGeneratorLog"],
            onQueryStarted: (_, { dispatch, queryFulfilled }) =>
                afterGeneration(dispatch, queryFulfilled),
        }),
        //გენერატორის ლოგი; grpId-ით მხოლოდ ერთი ჯგუფის
        getLessonGeneratorLog: builder.query<
            ILessonGeneratorLogRow[],
            number | undefined
        >({
            query: (grpId) => ({
                url:
                    grpId === undefined
                        ? `${baseUrl}/log`
                        : `${baseUrl}/log?grpId=${grpId}`,
            }),
            providesTags: ["LessonGeneratorLog"],
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                } catch (error) {
                    dispatch(setAlertApiLoadError(buildErrorMessage(error)));
                }
            },
        }),
    }),
});

export const {
    useGenerateGroupLessonsMutation,
    useGenerateGroupLastLessonMutation,
    useGenerateDirtyGroupsLessonsMutation,
    useGenerateAllGroupsLessonsMutation,
    useGetLessonGeneratorLogQuery,
} = lessonGeneratorApi;
