//AppParameters.ts

import type { IAppParametersState } from "./appcarcass/redux/slices/appParametersSlice";

export const appParameters: IAppParametersState = {
    appName: import.meta.env.VITE_REACT_APP_NAME as string,
    baseUrl: import.meta.env.VITE_REACT_APP_API_URI as string,
};
