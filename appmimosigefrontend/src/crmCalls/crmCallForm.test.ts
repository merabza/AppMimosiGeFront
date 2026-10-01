//crmCallForm.test.ts

import { describe, expect, it } from "vitest";
import {
    crmCallFormToRequest,
    crmCallToForm,
    defaultCallTypeId,
    newCrmCallForm,
    nowDateTimeInputValue,
} from "./crmCallForm";
import { crmCallData } from "../testUtils/crmCallsTestStore";

describe("crmCallForm", () => {
    it("gives the time to the minute with leading zeros", () => {
        expect(nowDateTimeInputValue(new Date(2026, 0, 5, 7, 3, 59))).toBe("2026-01-05T07:03");
        expect(nowDateTimeInputValue(new Date(2026, 11, 25, 19, 48, 0))).toBe("2026-12-25T19:48");
    });

    // Access: the call type defaulted to 1 and the date to Now(); the result is to be chosen
    it("starts a new call with the default type, the given time and no result", () => {
        expect(newCrmCallForm("2026-10-01T10:15", "11")).toEqual({
            academicYearId: "11",
            studentContractId: "",
            callTypeId: "1",
            callDate: "2026-10-01T10:15",
            answerTypeId: "",
            callConversation: "",
            mustPayDate: "",
        });
        expect(defaultCallTypeId).toBe("1");
    });

    it("starts a new call on a given contract", () => {
        expect(newCrmCallForm("2026-10-01T10:15", "11", "10").studentContractId).toBe("10");
    });

    // the browser's datetime-local takes minutes, the date input a day
    it("fills the form from a call", () => {
        expect(crmCallToForm(crmCallData())).toEqual({
            academicYearId: "11",
            studentContractId: "10",
            callTypeId: "1",
            callDate: "2026-09-24T19:48",
            answerTypeId: "3",
            callConversation: "will pay next week",
            mustPayDate: "2026-10-08",
        });
    });

    it("fills empty texts for a call without conversation and date", () => {
        const form = crmCallToForm(crmCallData({ callConversation: null, mustPayDate: null }));

        expect(form.callConversation).toBe("");
        expect(form.mustPayDate).toBe("");
    });

    it("builds the request with seconds, numbers and a trimmed text", () => {
        expect(
            crmCallFormToRequest({
                academicYearId: "11",
                studentContractId: "10",
                callTypeId: "1",
                callDate: "2026-10-01T10:15",
                answerTypeId: "2",
                callConversation: "  no answer  ",
                mustPayDate: "2026-10-08",
            })
        ).toEqual({
            studentContractId: 10,
            callTypeId: 1,
            callDate: "2026-10-01T10:15:00",
            answerTypeId: 2,
            callConversation: "no answer",
            mustPayDate: "2026-10-08",
        });
    });

    // the server tells a missing result; empty texts are sent as null
    it("sends empty values as null", () => {
        const request = crmCallFormToRequest(newCrmCallForm("2026-10-01T10:15", "11", "10"));

        expect(request.answerTypeId).toBeNull();
        expect(request.mustPayDate).toBeNull();
        expect(crmCallFormToRequest({ ...newCrmCallForm("2026-10-01T10:15", "11"), callConversation: "   " })
            .callConversation).toBeNull();
    });
});
