//Home.tsx

import type { FC } from "react";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAlert } from "../appcarcass/hooks/useAlert";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";

const Home: FC = () => {
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    return (
        <div>
            <h1>გამარჯობა</h1>
            <p>კეთილი იყოს შენი მობრძანება</p>
            <p>ეს არის მიმოსის პროგრამა</p>
            <p>მომავალში აქ დაემატება ხშირად გამოყენებადი ბმულები</p>
        </div>
    );
};

export default Home;
