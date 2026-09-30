//groupsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const groupsMenuKey = "groups";
export const groupEditRoute = "groupEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasGroupsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === groupsMenuKey);
}
