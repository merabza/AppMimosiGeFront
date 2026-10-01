//crmCallsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const crmCallsMenuKey = "crmCalls";
export const crmCallEditRoute = "crmCallEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasCrmCallsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === crmCallsMenuKey);
}

export function crmCallEditUrl(crmCallId?: number): string {
    return crmCallId === undefined
        ? `/${crmCallEditRoute}`
        : `/${crmCallEditRoute}/${crmCallId}`;
}
