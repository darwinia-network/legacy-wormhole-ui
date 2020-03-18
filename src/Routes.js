import React from "react";
import {Router, Route, Switch} from "react-router-dom";
import {asyncComponent} from "./components/AsyncComponent";
import { createBrowserHistory} from "history";
const AsyncNotFound = asyncComponent(import("./page/NotFound"));
const AsyncClaims = asyncComponent(import("./page/Claims"));

const history = createBrowserHistory();


export default () =>
    <Router history={history}>
        <Switch>
            <Route
                exact
                component={AsyncClaims}
                path='/'
            />
            <Route component={AsyncNotFound}/>
        </Switch>
    </Router>
