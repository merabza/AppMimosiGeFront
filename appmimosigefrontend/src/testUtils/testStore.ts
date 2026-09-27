//testStore.ts

import { vi } from "vitest";

export const testBaseUrl = "http://localhost:5070/api/v1";

export interface FetchCall {
    method: string;
    url: string;
    body: unknown;
    authorization: string | null;
}

export interface FetchReply {
    status: number;
    body?: unknown;
}

// ცვლის გლობალურ fetch-ს: ყოველი მოთხოვნა ჩაიწერება და პასუხს მოწოდებული ფუნქცია აბრუნებს
// (დაუსრულებელი promise მოთხოვნას ლოდინის მდგომარეობაში ტოვებს)
export function mockFetch(reply: (call: FetchCall) => FetchReply | Promise<FetchReply>): FetchCall[] {
    const calls: FetchCall[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const text = await request.text();
            const call: FetchCall = {
                method: request.method,
                url: request.url,
                body: text ? JSON.parse(text) : undefined,
                authorization: request.headers.get("authorization"),
            };
            calls.push(call);
            const { status, body } = await reply(call);
            return new Response(body === undefined ? null : JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        })
    );
    return calls;
}
