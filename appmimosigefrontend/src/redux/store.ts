//store.ts

import { configureStore } from "@reduxjs/toolkit";

//Slices carcass
import alertReducer from "../appcarcass/redux/slices/alertSlice";
import appParametersReducer from "../appcarcass/redux/slices/appParametersSlice";
import dataTypesReducer from "../appcarcass/redux/slices/dataTypesSlice";
import masterDataReducer from "../appcarcass/redux/slices/masterdataSlice";
import navMenuReducer from "../appcarcass/redux/slices/navMenuSlice";
import rightsReducer from "../appcarcass/redux/slices/rightsSlice";
import userReducer from "../appcarcass/redux/slices/userSlice";
//Slices project

//Middlewares
import { rtkQueryErrorLogger } from "../appcarcass/redux/rtkQueryErrorLogger";

//Apis - carcass
import { authenticationApi } from "../appcarcass/redux/api/authenticationApi";
import { dataTypesApi } from "../appcarcass/redux/api/dataTypesApi";
import { masterdataApi } from "../appcarcass/redux/api/masterdataApi";
import { rightsApi } from "../appcarcass/redux/api/rightsApi";
import { userRightsApi } from "../appcarcass/redux/api/userRightsApi";
//Apis - project

export const store = configureStore({
    reducer: {
        //reducers - carcass
        [authenticationApi.reducerPath]: authenticationApi.reducer,
        [dataTypesApi.reducerPath]: dataTypesApi.reducer,
        [masterdataApi.reducerPath]: masterdataApi.reducer,
        [rightsApi.reducerPath]: rightsApi.reducer,
        [userRightsApi.reducerPath]: userRightsApi.reducer,
        //reducers - project

        //states - carcass
        alertState: alertReducer,
        appParametersState: appParametersReducer,
        dataTypesState: dataTypesReducer,
        masterDataState: masterDataReducer,
        navMenuState: navMenuReducer,
        rightsState: rightsReducer,
        userState: userReducer,
        //states - project
    },
    devTools: import.meta.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }).concat([
            rtkQueryErrorLogger,
            //middlewares - carcass
            authenticationApi.middleware,
            dataTypesApi.middleware,
            masterdataApi.middleware,
            rightsApi.middleware,
            userRightsApi.middleware,
            //middlewares - project
        ]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
//ესენი hook-ში გადავიტანე
//export const useAppDispatch = () => useDispatch<AppDispatch>();
//export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

//ეს ჯერ არ ვიცი გამომადგება თუ არა
//export type AppThunk<ReturnType = void> = ThunkAction<
//    ReturnType,
//    RootState,
//    unknown,
//    Action<string>
//>;
