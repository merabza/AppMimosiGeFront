//teacherContractsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const teacherContractsMenuKey = "teacherContracts";
export const teacherContractEditRoute = "teacherContractEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasTeacherContractsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === teacherContractsMenuKey);
}
