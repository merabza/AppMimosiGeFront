//workHoursMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const workHoursMenuKey = "workHours";
export const workHourEditRoute = "workHourEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasWorkHoursRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === workHoursMenuKey);
}

export function workHourEditUrl(whId?: number): string {
    return whId === undefined
        ? `/${workHourEditRoute}`
        : `/${workHourEditRoute}/${whId}`;
}
