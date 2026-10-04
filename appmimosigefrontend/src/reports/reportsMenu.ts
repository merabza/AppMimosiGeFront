//reportsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს, თითო
//რეპორტს კი დამატებით საკუთარი სპეციალური უფლება (AppClaim) სჭირდება
export const reportsMenuKey = "reports";

//undefined: მენიუ ჯერ იტვირთება
export function useHasReportsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector((state) => state.navMenuState);
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === reportsMenuKey);
}
