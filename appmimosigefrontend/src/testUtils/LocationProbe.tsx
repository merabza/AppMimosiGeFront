//LocationProbe.tsx

import { useLocation, useNavigate } from "react-router-dom";

// the current URL, to check where a page navigated to
export default function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
}

// the browser's back button, to check which history entries a page left behind
export function BackButton() {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => navigate(-1)}>
            test back
        </button>
    );
}
