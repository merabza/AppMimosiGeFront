//LocationProbe.tsx

import { useLocation } from "react-router-dom";

// the current URL, to check where a page navigated to
export default function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
}
