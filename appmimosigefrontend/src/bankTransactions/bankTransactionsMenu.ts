//bankTransactionsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const bankTransactionsMenuKey = "bankTransactions";
export const bankTransactionEditRoute = "bankTransactionEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasBankTransactionsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector((state) => state.navMenuState);
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === bankTransactionsMenuKey);
}

export function bankTransactionEditUrl(bankTransactionId: number): string {
    return `/${bankTransactionEditRoute}/${bankTransactionId}`;
}
