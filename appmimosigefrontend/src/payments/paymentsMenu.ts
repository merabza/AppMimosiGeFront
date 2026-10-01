//paymentsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const paymentsMenuKey = "payments";
export const paymentEditRoute = "paymentEdit";

//სპეციალური უფლება (AppClaim) "გადახდების შემოწმება": backend-ის PaymentClaims.CheckPayments
export const checkPaymentsClaim = "CheckPayments";

//undefined: მენიუ ჯერ იტვირთება
export function useHasPaymentsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === paymentsMenuKey);
}

//"შემოწმებულია" ალამს ხედავს და ცვლის მხოლოდ ამ უფლების მქონე როლი (D77). შესვლისას მიღებული უფლებები;
//სერვერი უფლებას ყოველ მოთხოვნაზე თავად ამოწმებს
export function useCanCheckPayments(): boolean {
    const user = useAppSelector((state) => state.userState.user);
    return user?.appClaims?.includes(checkPaymentsClaim) ?? false;
}

export function paymentEditUrl(paymentId?: number): string {
    return paymentId === undefined
        ? `/${paymentEditRoute}`
        : `/${paymentEditRoute}/${paymentId}`;
}
