//salaryMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const salaryMenuKey = "salary";
export const salaryEditRoute = "salaryEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasSalaryRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector((state) => state.navMenuState);
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === salaryMenuKey);
}

export function salaryEditUrl(shId?: number): string {
    return shId === undefined ? `/${salaryEditRoute}` : `/${salaryEditRoute}/${shId}`;
}
