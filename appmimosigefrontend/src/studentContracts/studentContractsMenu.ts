//studentContractsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const studentContractsMenuKey = "studentContracts";
export const studentContractEditRoute = "studentContractEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasStudentContractsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === studentContractsMenuKey);
}
