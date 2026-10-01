//lessonsMenu.ts

import { useAppSelector } from "../appcarcass/redux/hooks";

//მენიუს პუნქტის გასაღები (MenKey და MenLinkKey): backend-ის endpoint-ები ამ პუნქტის უფლებას ამოწმებს
export const lessonsMenuKey = "lessons";
export const lessonEditRoute = "lessonEdit";

//undefined: მენიუ ჯერ იტვირთება
export function useHasLessonsRight(): boolean | undefined {
    const { flatMenu, isMenuLoading } = useAppSelector(
        (state) => state.navMenuState
    );
    if (isMenuLoading || !flatMenu) return undefined;
    return flatMenu.some((f) => f.menLinkKey === lessonsMenuKey);
}

//ჯგუფის გვერდიდან (Access-ის "ამ ჯგუფის გაკვეთილები"): ჯგუფის ყველა გაკვეთილი, თარიღის შეზღუდვის გარეშე
export function groupLessonsUrl(grpId: number): string {
    return `/${lessonsMenuKey}?grpId=${grpId}&dateFrom=&dateTo=`;
}

export function lessonEditUrl(lessonId: number): string {
    return `/${lessonEditRoute}/${lessonId}`;
}
