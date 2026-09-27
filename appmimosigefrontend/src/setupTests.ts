//setupTests.ts

import "@testing-library/jest-dom/vitest";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// იკონებს App.tsx არეგისტრირებს, ტესტებში დახატული კომპონენტები კი App-ს არ გადიან
library.add(fas);

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
});
