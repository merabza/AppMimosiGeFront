//TopNavMenu.tsx

import { Route, Routes } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Navbar, Button } from "react-bootstrap";

import { useAppDispatch } from "./appcarcass/redux/hooks";
import { toggleactive } from "./appcarcass/redux/slices/navMenuSlice";
import RightsTopNavMenu from "./appcarcass/rights/RightsTopNavMenu";
import ProfileTopNavMenu from "./appcarcass/user/ProfileTopNavMenu";
import type { FC } from "react";

const TopNavMenu: FC = () => {
    const dispatch = useAppDispatch();

    return (
        <Navbar bg="light" expand="lg">
            <Button
                className="btn-space"
                variant="info"
                onClick={() => dispatch(toggleactive())}
            >
                <FontAwesomeIcon icon="align-left" />
                <span> მენიუ</span>
            </Button>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Routes>
                    {/* Home */}
                    <Route path="/" element={<div />} />
                    {/* Carcass */}
                    <Route
                        path="/Rights/:rView/:dtKey/:key"
                        element={<RightsTopNavMenu />}
                    />
                    <Route
                        path="/Rights/:rView/:dtKey"
                        element={<RightsTopNavMenu />}
                    />
                    <Route
                        path="/Rights/:rView"
                        element={<RightsTopNavMenu />}
                    />
                    <Route path="/Rights" element={<RightsTopNavMenu />} />
                    <Route path="/profile" element={<ProfileTopNavMenu />} />
                    {/* Project */}
                </Routes>
            </Navbar.Collapse>
        </Navbar>
    );
};

export default TopNavMenu;
