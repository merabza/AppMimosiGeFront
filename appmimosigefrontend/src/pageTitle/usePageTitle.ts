//usePageTitle.ts

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSelector } from "../appcarcass/redux/hooks";
import { pageTitle } from "./pageTitle";

//ჩანართის სათაურს მიმდინარე მენიუს ელემენტის სახელით აყენებს;
//გასვლისას (მაგალითად, შესვლის გვერდზე) ისევ პროგრამის სახელი რჩება
export function usePageTitle(): void {
    const { pathname } = useLocation();
    const flatMenu = useAppSelector((state) => state.navMenuState.flatMenu);
    const appName = useAppSelector(
        (state) => state.appParametersState.appName
    );

    useEffect(() => {
        document.title = pageTitle(appName, flatMenu, pathname);
    }, [appName, flatMenu, pathname]);

    useEffect(
        () => () => {
            document.title = appName;
        },
        [appName]
    );
}
