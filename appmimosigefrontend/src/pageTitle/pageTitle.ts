//pageTitle.ts

import type { IMenuItmModel } from "../appcarcass/redux/types/userRightsTypes";

//მენიუს ელემენტის ბმული, ისეთივე, როგორსაც NavMenu აკეთებს
const menuItemPath = (menuItem: IMenuItmModel): string =>
    `/${menuItem.menLinkKey}${menuItem.menValue ? `/${menuItem.menValue}` : ""}`.toLowerCase();

//რედაქტორის გვერდები მენიუში არ არის: სათაურს მათი სიის მენიუს ელემენტი იძლევა.
//withTable: გზის მეორე ნაწილი ცხრილის სახელია (mdItemEdit/:tableName/:id), ჩანაწერის id მის შემდეგ მოდის
const editorRoutes: Record<string, { listKey: string; withTable?: boolean }> = {
    studentcontractedit: { listKey: "studentContracts" },
    teachercontractedit: { listKey: "teacherContracts" },
    groupedit: { listKey: "groups" },
    lessonedit: { listKey: "lessons" },
    paymentedit: { listKey: "payments" },
    banktransactionedit: { listKey: "bankTransactions" },
    crmcalledit: { listKey: "crmCalls" },
    workhouredit: { listKey: "workHours" },
    salaryedit: { listKey: "salary" },
    mditemedit: { listKey: "mdList", withTable: true },
};

//მენიუს გარეშე გვერდები, რომლებსაც საკუთარი სათაური აქვთ
const fixedTitles: Record<string, string> = {
    profile: "პროფილი",
    lessongeneratorlog: "გენერატორის ლოგი",
};

//მენიუს ელემენტი, რომლის ბმულიც მიმდინარე გზას ყველაზე გრძელ თავსართად ემთხვევა
export function findMenuItemByPath(
    flatMenu: IMenuItmModel[] | null,
    pathname: string
): IMenuItmModel | null {
    const path = pathname.toLowerCase().replace(/\/+$/, "");
    let found: IMenuItmModel | null = null;
    let foundLength = 0;
    for (const menuItem of flatMenu ?? []) {
        const itemPath = menuItemPath(menuItem);
        if (
            (path === itemPath || path.startsWith(`${itemPath}/`)) &&
            itemPath.length > foundLength
        ) {
            found = menuItem;
            foundLength = itemPath.length;
        }
    }
    return found;
}

//გვერდის სათაური პროგრამის სახელის გარეშე; null, თუ გვერდს სათაური არ აქვს
function pageName(flatMenu: IMenuItmModel[] | null, pathname: string): string | null {
    const segments = pathname.split("/").filter((segment) => segment !== "");
    const firstSegment = (segments[0] ?? "").toLowerCase();

    const fixedTitle = fixedTitles[firstSegment];
    if (fixedTitle) return fixedTitle;

    const editor = editorRoutes[firstSegment];
    if (editor) {
        const listPath = ["", editor.listKey, ...segments.slice(1)].join("/");
        const listItem = findMenuItemByPath(flatMenu, listPath);
        if (!listItem) return null;
        const isNew = segments.length <= (editor.withTable ? 2 : 1);
        return `${listItem.menName}: ${isNew ? "ახალი" : "რედაქტირება"}`;
    }

    return findMenuItemByPath(flatMenu, pathname)?.menName ?? null;
}

//ბრაუზერის ჩანართის სათაური: "გვერდი - მიმოსი", სათაურის გარეშე მხოლოდ პროგრამის სახელი
export function pageTitle(
    appName: string,
    flatMenu: IMenuItmModel[] | null,
    pathname: string
): string {
    const name = pageName(flatMenu, pathname);
    return name ? `${name} - ${appName}` : appName;
}
