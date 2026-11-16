//pageTitle.test.ts

import { describe, expect, it } from "vitest";
import type { IMenuItmModel } from "../appcarcass/redux/types/userRightsTypes";
import { findMenuItemByPath, pageTitle } from "./pageTitle";

function item(menId: number, menName: string, menLinkKey: string, menValue: string | null = null): IMenuItmModel {
    return {
        menId,
        menKey: `${menLinkKey}${menValue ?? ""}`,
        menName,
        menValue,
        menGroupId: 1,
        sortId: menId,
        menLinkKey,
        menIconName: null,
        create: true,
        update: true,
        delete: true,
        confirm: false,
    };
}

const flatMenu = [
    item(1, "ჯგუფები", "groups"),
    item(2, "კურსები", "mdList", "courses"),
    item(3, "სასწავლო წლები", "mdList", "academicYears"),
    item(4, "უფლებები", "Rights"),
];

describe("findMenuItemByPath", () => {
    it.each([
        ["/groups", 1],
        ["/groups/", 1],
        ["/GROUPS", 1],
        ["/mdList/courses", 2],
        ["/mdList/courses/5", 2],
        ["/mdList/academicYears", 3],
        ["/Rights/roles/Menu/Admin", 4],
    ])("finds the menu item of %s", (path, menId) => {
        expect(findMenuItemByPath(flatMenu, path)?.menId).toBe(menId);
    });

    it.each(["/", "/groupEdit/5", "/mdList", "/mdList/coursesX", "/profile"])(
        "finds no menu item for %s",
        (path) => {
            expect(findMenuItemByPath(flatMenu, path)).toBeNull();
        }
    );

    it("prefers the longest matching link", () => {
        const menu = [item(1, "სია", "mdList"), item(2, "კურსები", "mdList", "courses")];
        expect(findMenuItemByPath(menu, "/mdList/courses")?.menId).toBe(2);
        expect(findMenuItemByPath([...menu].reverse(), "/mdList/courses")?.menId).toBe(2);
        expect(findMenuItemByPath(menu, "/mdList/other")?.menId).toBe(1);
    });

    it("finds nothing without a menu", () => {
        expect(findMenuItemByPath(null, "/groups")).toBeNull();
    });
});

describe("pageTitle", () => {
    it("puts the menu item's name before the app name", () => {
        expect(pageTitle("მიმოსი", flatMenu, "/mdList/courses")).toBe("კურსები - მიმოსი");
    });

    it("is the app name on a page without a menu item", () => {
        expect(pageTitle("მიმოსი", flatMenu, "/")).toBe("მიმოსი");
        expect(pageTitle("მიმოსი", flatMenu, "/unknown")).toBe("მიმოსი");
        expect(pageTitle("მიმოსი", null, "/groups")).toBe("მიმოსი");
    });

    it.each([
        ["/groupEdit/5", "ჯგუფები: რედაქტირება - მიმოსი"],
        ["/groupEdit", "ჯგუფები: ახალი - მიმოსი"],
        ["/GROUPEDIT/5/", "ჯგუფები: რედაქტირება - მიმოსი"],
        ["/mdItemEdit/courses/7", "კურსები: რედაქტირება - მიმოსი"],
        ["/mdItemEdit/courses", "კურსები: ახალი - მიმოსი"],
        ["/mdItemEdit/academicYears/2", "სასწავლო წლები: რედაქტირება - მიმოსი"],
    ])("names the editor %s after its list", (path, title) => {
        expect(pageTitle("მიმოსი", flatMenu, path)).toBe(title);
    });

    it.each([
        "studentContractEdit",
        "teacherContractEdit",
        "lessonEdit",
        "paymentEdit",
        "bankTransactionEdit",
        "crmCallEdit",
        "workHourEdit",
        "salaryEdit",
    ])("finds the list of %s", (editor) => {
        const listKey = {
            studentContractEdit: "studentContracts",
            teacherContractEdit: "teacherContracts",
            lessonEdit: "lessons",
            paymentEdit: "payments",
            bankTransactionEdit: "bankTransactions",
            crmCallEdit: "crmCalls",
            workHourEdit: "workHours",
            salaryEdit: "salary",
        }[editor]!;
        expect(pageTitle("მიმოსი", [item(1, "სია", listKey)], `/${editor}/3`)).toBe("სია: რედაქტირება - მიმოსი");
    });

    it("is the app name for an editor whose list is not in the menu", () => {
        expect(pageTitle("მიმოსი", flatMenu, "/paymentEdit/3")).toBe("მიმოსი");
        expect(pageTitle("მიმოსი", flatMenu, "/mdItemEdit/rooms/3")).toBe("მიმოსი");
    });

    it.each([
        ["/profile", "პროფილი - მიმოსი"],
        ["/lessonGeneratorLog", "გენერატორის ლოგი - მიმოსი"],
    ])("gives %s its own title", (path, title) => {
        expect(pageTitle("მიმოსი", null, path)).toBe(title);
    });
});
