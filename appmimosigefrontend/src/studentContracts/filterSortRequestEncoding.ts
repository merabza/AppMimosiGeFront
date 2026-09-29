//filterSortRequestEncoding.ts

import type { IFilterSortRequest } from "../appcarcass/grid/GridViewTypes";

//backend-ის FilterSortRequestFactory: base64 -> UTF-8 -> URL-decode -> JSON.
//btoa მხოლოდ Latin-1 სიმბოლოებს იღებს, ამიტომ ქართული ძებნის ტექსტი ჯერ URL-encode-ით გადაიყვანება,
//base64-ის "+", "/" და "=" კი query string-ში ცალკე უნდა დაიკოდოს
export function encodeFilterSortRequest(request: IFilterSortRequest): string {
    return encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(request))));
}
