//setupTests.ts

import "@testing-library/jest-dom/vitest";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// იკონებს App.tsx არეგისტრირებს, ტესტებში დახატული კომპონენტები კი App-ს არ გადიან
library.add(fas);

// ყველა ტესტის ერთად გაშვებისას worker-ის პირველი ტესტის პირველ დახატვას (მოდულების ჩატვირთვა, სიის 300 ms-იანი
// დაყოვნება) 1 წამზე მეტი სჭირდება, ამიტომ findBy*/waitFor ნაგულისხმევ 1 წამს ვერ ასწრებდა
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
});
