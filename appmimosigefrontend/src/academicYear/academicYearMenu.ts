//academicYearMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის ოსტატის endpoint-ები ამ პუნქტის უფლებას ამოწმებს.
//პუნქტი მხოლოდ ადმინისტრატორს აქვს
export const newAcademicYearMenuKey = "newAcademicYear";

//undefined: მენიუ ჯერ იტვირთება
export function useHasNewAcademicYearRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector((state) => state.navMenuState);
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === newAcademicYearMenuKey);
}
