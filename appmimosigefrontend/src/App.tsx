//App.tsx

import "./App.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";

import LoginPage from "./appcarcass/common/LoginPage";
import PrivateApp from "./appcarcass/common/PrivateApp";
import RegistrationPage from "./appcarcass/common/RegistrationPage";

import { library } from "@fortawesome/fontawesome-svg-core";
import {
    faCheckSquare,
    faCoffee,
    faSync,
    faSave,
    faSignOutAlt,
    faHome,
    faAlignLeft,
    faBarcode,
    faArrowsAltH,
    faLongArrowAltDown,
    faSquare,
    faMicroscope,
    faFolder,
    faFolderOpen,
    faEdit,
    faTrash,
    faPlus,
    faPlusSquare,
    faMinusSquare,
    faWindowClose,
    faSignInAlt,
    faUserPlus,
    faUser,
    faUserMinus,
    faKey,
    faFileAlt,
    faMinus,
    faBezierCurve,
    faShapes,
    faArrowDown,
    faArrowUp,
    faChevronLeft,
    faFileExport,
    faTimes,
    faCheck,
    faUsersCog,
    faStream,
    faCheckCircle,
    faRobot,
    faPaperclip,
    faAngleLeft,
    faAngleDoubleLeft,
    faAngleRight,
    faAngleDoubleRight,
    faSort,
    faSortUp,
    faSortDown,
} from "@fortawesome/free-solid-svg-icons";
import Layout from "./appcarcass/common/Layout";
import Profile from "./appcarcass/user/Profile";
import FrmRights from "./appcarcass/rights/FrmRights";
import Home from "./pages/Home";
import MdItemEdit from "./appcarcass/masterdata/MdItemEdit";
import PageNotFound from "./appcarcass/common/PageNotFound";
import type { FC } from "react";
import MdList from "./appcarcass/masterdata/MdList";

library.add(
    faCheckSquare,
    faCoffee,
    faSync,
    faSave,
    faSignOutAlt,
    faHome,
    faAlignLeft,
    faBarcode,
    faArrowsAltH,
    faLongArrowAltDown,
    faSquare,
    faMicroscope,
    faFolder,
    faFolderOpen,
    faEdit,
    faTrash,
    faPlus,
    faPlusSquare,
    faMinusSquare,
    faWindowClose,
    faSignInAlt,
    faUserPlus,
    faUser,
    faUserMinus,
    faKey,
    faFileAlt,
    faMinus,
    faBezierCurve,
    faShapes,
    faArrowDown,
    faArrowUp,
    faChevronLeft,
    faFileExport,
    faTimes,
    faCheck,
    faUsersCog,
    faStream,
    faCheckCircle,
    faRobot,
    faPaperclip,
    faAngleLeft,
    faAngleDoubleLeft,
    faAngleRight,
    faAngleDoubleRight,
    faSort,
    faSortUp,
    faSortDown
);

const App: FC = () => {
    // console.log("App start");

    return (
        <BrowserRouter>
            <QueryParamProvider adapter={ReactRouter6Adapter}>
                {/* <div className="content-wrapper"> */}
                <Routes>
                    <Route path="/" element={<PrivateApp />}>
                        <Route path="/*" element={<Layout />}>
                            <Route index element={<Home />} />

                            <Route path="profile" element={<Profile />} />

                            <Route
                                path="Rights/:rView/:dtKey/:key"
                                element={<FrmRights />}
                            />
                            <Route
                                path="Rights/:rView/:dtKey"
                                element={<FrmRights />}
                            />
                            <Route
                                path="Rights/:rView"
                                element={<FrmRights />}
                            />
                            <Route path="Rights" element={<FrmRights />} />

                            <Route
                                path="mdList/:tableName/:recName"
                                element={<MdList />}
                            />
                            <Route
                                path="mdList/:tableName"
                                element={<MdList />}
                            />

                            <Route
                                path="mdItemEdit/:tableName/:mdIdValue"
                                element={<MdItemEdit />}
                            />
                            <Route
                                path="mdItemEdit/:tableName"
                                element={<MdItemEdit />}
                            />

                            {/* Project AppRoutes start */}


                            {/* Project AppRoutes finish */}

                            {/* 👇️ only match this when no other routes match */}
                            <Route path="*" element={<PageNotFound />} />
                        </Route>
                    </Route>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="registration" element={<RegistrationPage />} />
                </Routes>
                {/* </div> */}
            </QueryParamProvider>
        </BrowserRouter>
    );
};

export default App;
